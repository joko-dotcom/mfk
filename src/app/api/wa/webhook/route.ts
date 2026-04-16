// Incoming webhook from wa-bot. The bot forwards parsed commands here so the
// business logic (bid placement, account linking, etc.) stays in the main app
// and only one codebase owns Prisma mutations.
//
// Authentication: the bot signs every request with `x-wa-secret` equal to the
// shared WA_BOT_SECRET env var. Treat this endpoint as privileged.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/bid-bus";
import { formatIDR, tierRank } from "@/lib/utils";

export const dynamic = "force-dynamic";

const commandSchema = z.discriminatedUnion("command", [
  z.object({
    command: z.literal("LINK_VERIFY"),
    jid: z.string(),
    phone: z.string(),
    code: z.string(),
  }),
  z.object({
    command: z.literal("BID"),
    jid: z.string(),
    phone: z.string(),
    auctionId: z.string(),
    amount: z.number().int().positive(),
    groupId: z.string().optional(),
  }),
  z.object({
    command: z.literal("MYACCOUNT"),
    jid: z.string(),
    phone: z.string(),
  }),
  z.object({
    command: z.literal("GROUP_REGISTER"),
    groupId: z.string(),
    groupName: z.string(),
    sellerSlug: z.string(),
    adminPhone: z.string(),
  }),
]);

function auth(req: Request) {
  const secret = process.env.WA_BOT_SECRET;
  if (!secret) return true; // permissive dev
  return req.headers.get("x-wa-secret") === secret;
}

export async function POST(req: Request) {
  if (!auth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = commandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cmd = parsed.data;
  await prisma.waInboundLog.create({
    data: {
      jid: "jid" in cmd ? cmd.jid : cmd.groupId,
      command: cmd.command,
      payload: JSON.stringify(cmd),
    },
  });

  try {
    if (cmd.command === "LINK_VERIFY") {
      const user = await prisma.user.findFirst({
        where: {
          waLinkCode: cmd.code.toUpperCase(),
          waLinkExpires: { gt: new Date() },
        },
      });
      if (!user) {
        return NextResponse.json({
          ok: false,
          reply: "Kode tidak valid / kedaluwarsa. Minta kode baru di /account/whatsapp.",
        });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          whatsappNumber: cmd.phone,
          whatsappVerified: true,
          waLinkCode: null,
          waLinkExpires: null,
        },
      });
      return NextResponse.json({
        ok: true,
        reply:
          `✅ Nomor ${cmd.phone} berhasil di-link ke akun ${user.email}.\n` +
          `Sekarang Anda bisa bid via WhatsApp dengan: /bid <auctionId> <nominal>`,
      });
    }

    if (cmd.command === "MYACCOUNT") {
      const user = await prisma.user.findUnique({
        where: { whatsappNumber: cmd.phone },
      });
      if (!user) {
        return NextResponse.json({
          ok: true,
          reply:
            "Nomor Anda belum ter-link. Buka https://mafiakoi.id/account/whatsapp untuk generate kode link.",
        });
      }
      return NextResponse.json({
        ok: true,
        reply:
          `👤 *${user.name}*\n` +
          `Email: ${user.email}\n` +
          `Role: ${user.role}\n` +
          `Membership: ${user.membershipTier}\n` +
          (user.isBlacklisted
            ? `⚠️ Akun blacklist: ${user.blacklistReason}\n`
            : `Strike bid-and-run: ${user.bidAndRunCount}\n`),
      });
    }

    if (cmd.command === "BID") {
      const user = await prisma.user.findUnique({
        where: { whatsappNumber: cmd.phone },
      });
      if (!user) {
        return NextResponse.json({
          ok: false,
          reply:
            "Nomor belum ter-link ke akun. Kirim /register <email> untuk link, lalu ikuti instruksi.",
        });
      }
      if (user.isBlacklisted) {
        return NextResponse.json({
          ok: false,
          reply: `🚫 Akun Anda di-blacklist (${user.blacklistReason}). Hubungi admin.`,
        });
      }
      try {
        const result = await prisma.$transaction(async (tx) => {
          const auction = await tx.auction.findUnique({
            where: { id: cmd.auctionId },
            include: { koi: { include: { seller: true } } },
          });
          if (!auction) throw new Error("Auction tidak ditemukan");
          if (auction.status !== "SCHEDULED" && auction.status !== "LIVE") {
            throw new Error("Lelang sudah berakhir");
          }
          const now = new Date();
          if (now > auction.endTime) throw new Error("Lelang sudah berakhir");
          if (now < auction.startTime) throw new Error("Lelang belum dimulai");
          if (auction.koi.seller.userId === user.id) {
            throw new Error("Seller tidak boleh bid di lelang sendiri");
          }
          if (
            auction.memberOnly &&
            tierRank(user.membershipTier) < tierRank(auction.minTier)
          ) {
            throw new Error(`Lelang eksklusif member ${auction.minTier}+`);
          }
          const minNext = Math.max(
            auction.currentBid + auction.minIncrement,
            auction.startingBid + auction.minIncrement,
          );
          if (cmd.amount < minNext) throw new Error(`Bid minimal ${formatIDR(minNext)}`);

          const extendThreshold = new Date(
            auction.endTime.getTime() - auction.antiSniperMinutes * 60_000,
          );
          const newEndTime =
            now > extendThreshold
              ? new Date(now.getTime() + auction.antiSniperMinutes * 60_000)
              : auction.endTime;

          const updated = await tx.auction.update({
            where: { id: auction.id },
            data: { currentBid: cmd.amount, endTime: newEndTime, status: "LIVE" },
          });
          await tx.bid.create({
            data: { auctionId: auction.id, userId: user.id, amount: cmd.amount },
          });
          return { updated, koiName: auction.koi.name };
        });

        publish({
          type: "bid",
          auctionId: cmd.auctionId,
          amount: result.updated.currentBid,
          userName: user.name,
          userId: user.id,
          endTime: result.updated.endTime.toISOString(),
          at: new Date().toISOString(),
        });

        return NextResponse.json({
          ok: true,
          reply:
            `✅ Bid berhasil!\n` +
            `Ikan: ${result.koiName}\n` +
            `Nominal: ${formatIDR(result.updated.currentBid)}\n` +
            `Berakhir: ${result.updated.endTime.toLocaleString("id-ID")}`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Gagal bid";
        return NextResponse.json({ ok: false, reply: `❌ ${msg}` });
      }
    }

    if (cmd.command === "GROUP_REGISTER") {
      const seller = await prisma.seller.findUnique({
        where: { slug: cmd.sellerSlug },
        include: { user: true },
      });
      if (!seller) {
        return NextResponse.json({
          ok: false,
          reply: `Farm dengan slug "${cmd.sellerSlug}" tidak ditemukan.`,
        });
      }
      if (!seller.user.whatsappNumber || seller.user.whatsappNumber !== cmd.adminPhone) {
        return NextResponse.json({
          ok: false,
          reply:
            "Nomor admin grup tidak cocok dengan nomor terdaftar seller. Link nomor seller dulu di /account/whatsapp.",
        });
      }
      await prisma.seller.update({
        where: { id: seller.id },
        data: {
          whatsappGroupId: cmd.groupId,
          whatsappGroupName: cmd.groupName,
        },
      });
      return NextResponse.json({
        ok: true,
        reply:
          `✅ Grup "${cmd.groupName}" terhubung ke farm *${seller.farmName}*.\n` +
          `Bot akan kirim alert lelang, pemenang, dan bid-and-run di grup ini.`,
      });
    }

    return NextResponse.json({ ok: false, error: "unhandled" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
