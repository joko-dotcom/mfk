// Cron: flag auction winners who did not pay within their payment window.
// Vercel Cron hits this every hour; Next.js also auto-runs it when called.
//
// Behavior:
//   1. Finds Order.status === PENDING_PAYMENT with paymentDueAt < now.
//   2. Marks each Order as DEFAULTED, flaggedBidAndRun=true.
//   3. Increments buyer.bidAndRunCount + creates BlacklistStrike.
//   4. On strike >= 2 → user.isBlacklisted=true, user.blacklistReason=BID_AND_RUN.
//   5. Broadcasts the incident to the seller's WhatsApp group (if linked).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToSellerGroups, sendDirectMessage, phoneToJid } from "@/lib/wa-client";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

function assertCronAuth(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return; // permissive in dev
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    throw new Error("unauthorized");
  }
}

export async function GET(req: Request) {
  try {
    assertCronAuth(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const overdue = await prisma.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      flaggedBidAndRun: false,
      paymentDueAt: { lt: now },
    },
    include: {
      buyer: true,
      koi: { include: { seller: { include: { user: true } } } },
    },
    take: 100,
  });

  const processed: Array<{ orderId: string; userId: string; blacklisted: boolean }> = [];
  const sellerGroups = new Set<string>();
  const notifications: Array<{ groupId: string; text: string }> = [];
  const dmPings: Array<{ jid: string; text: string }> = [];

  for (const order of overdue) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "DEFAULTED",
          flaggedBidAndRun: true,
          notifiedDefaultAt: now,
        },
      });
      await tx.blacklistStrike.create({
        data: {
          userId: order.buyerId,
          reason: "BID_AND_RUN",
          orderId: order.id,
          note: `Overdue ${formatIDR(order.amount)} for koi ${order.koi.name}`,
        },
      });
      const user = await tx.user.update({
        where: { id: order.buyerId },
        data: { bidAndRunCount: { increment: 1 } },
      });
      let blacklisted = user.isBlacklisted;
      if (!blacklisted && user.bidAndRunCount >= 2) {
        await tx.user.update({
          where: { id: user.id },
          data: { isBlacklisted: true, blacklistReason: "BID_AND_RUN" },
        });
        blacklisted = true;
      }
      return { blacklisted };
    });

    processed.push({
      orderId: order.id,
      userId: order.buyerId,
      blacklisted: updated.blacklisted,
    });

    const sellerGroupId = order.koi.seller.whatsappGroupId;
    if (sellerGroupId) {
      sellerGroups.add(sellerGroupId);
      notifications.push({
        groupId: sellerGroupId,
        text:
          `⚠️ *BID & RUN ALERT*\n` +
          `Ikan: ${order.koi.name}\n` +
          `Nominal: ${formatIDR(order.amount)}\n` +
          `Pembeli: ${order.buyer.name} (strike #${order.buyer.bidAndRunCount + 1})\n` +
          (updated.blacklisted ? `Status: *BLACKLISTED* 🚫\n` : "") +
          `Order: ${order.id}\n` +
          `— Mafia Koi Auto Moderator`,
      });
    }

    if (order.buyer.whatsappNumber) {
      dmPings.push({
        jid: phoneToJid(order.buyer.whatsappNumber),
        text:
          `Halo ${order.buyer.name}, order *${order.id}* untuk ikan ${order.koi.name} ` +
          `senilai ${formatIDR(order.amount)} telah ditandai *BID & RUN* karena ` +
          `pembayaran melewati batas waktu. ${updated.blacklisted ? "Akun Anda telah di-blacklist." : "Strike bertambah; satu strike lagi dan akun akan di-blacklist."}`,
      });
    }
  }

  // Fire notifications (non-blocking failure OK)
  await Promise.allSettled([
    ...notifications.map((n) => broadcastToSellerGroups([n.groupId], n.text)),
    ...dmPings.map((d) => sendDirectMessage(d.jid, d.text)),
  ]);

  return NextResponse.json({
    ok: true,
    processed: processed.length,
    blacklistedCount: processed.filter((p) => p.blacklisted).length,
  });
}

export const POST = GET;
