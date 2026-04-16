// Cron: close auctions whose endTime passed, create Order with paymentDueAt.
// This is what starts the bid-and-run clock. Called hourly by Vercel Cron.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToSellerGroups, sendDirectMessage, phoneToJid } from "@/lib/wa-client";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

function assertCronAuth(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) throw new Error("unauthorized");
}

const PAYMENT_WINDOW_HOURS = Number(process.env.PAYMENT_WINDOW_HOURS ?? 24);
const FEE_BPS_FALLBACK = 700;

export async function GET(req: Request) {
  try {
    assertCronAuth(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const auctions = await prisma.auction.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
      endTime: { lt: now },
    },
    include: {
      koi: { include: { seller: { include: { user: true } } } },
      bids: { orderBy: { amount: "desc" }, take: 1, include: { user: true } },
    },
    take: 100,
  });

  const setting = await prisma.platformSetting.findFirst();
  const feeBps = setting?.auctionFeeBps ?? FEE_BPS_FALLBACK;

  const closures: Array<{ auctionId: string; orderId?: string }> = [];
  const messages: Array<() => Promise<unknown>> = [];

  for (const auction of auctions) {
    const topBid = auction.bids[0];
    if (!topBid || (auction.reservePrice && topBid.amount < auction.reservePrice)) {
      await prisma.auction.update({
        where: { id: auction.id },
        data: { status: "ENDED", winnerId: null },
      });
      closures.push({ auctionId: auction.id });
      continue;
    }

    const feeAmount = Math.round((topBid.amount * feeBps) / 10_000);
    const paymentDueAt = new Date(now.getTime() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);

    const order = await prisma.$transaction(async (tx) => {
      await tx.auction.update({
        where: { id: auction.id },
        data: { status: "ENDED", winnerId: topBid.userId, liveActive: false },
      });
      await tx.koi.update({
        where: { id: auction.koiId },
        data: { status: "SOLD" },
      });
      return tx.order.create({
        data: {
          koiId: auction.koiId,
          buyerId: topBid.userId,
          amount: topBid.amount,
          feeAmount,
          status: "PENDING_PAYMENT",
          paymentDueAt,
          sourceAuctionId: auction.id,
        },
      });
    });

    closures.push({ auctionId: auction.id, orderId: order.id });

    const sellerGroupId = auction.koi.seller.whatsappGroupId;
    const text =
      `🏆 *LELANG SELESAI*\n` +
      `Ikan: ${auction.koi.name}\n` +
      `Winning bid: ${formatIDR(topBid.amount)}\n` +
      `Pemenang: ${topBid.user.name}\n` +
      `Batas bayar: ${paymentDueAt.toLocaleString("id-ID")}\n` +
      `Order: ${order.id}`;

    if (sellerGroupId) {
      messages.push(() => broadcastToSellerGroups([sellerGroupId], text));
    }
    if (topBid.user.whatsappNumber) {
      messages.push(() =>
        sendDirectMessage(
          phoneToJid(topBid.user.whatsappNumber as string),
          `Selamat ${topBid.user.name}, Anda memenangkan lelang *${auction.koi.name}* ` +
            `seharga ${formatIDR(topBid.amount)}. Silakan lakukan pembayaran sebelum ` +
            `${paymentDueAt.toLocaleString("id-ID")} untuk menghindari blacklist.`,
        ),
      );
    }
  }

  await Promise.allSettled(messages.map((m) => m()));

  return NextResponse.json({ ok: true, finalized: closures.length });
}

export const POST = GET;
