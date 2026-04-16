// Buy-It-Now endpoint. Closes the auction immediately at buyItNowPrice, debits
// buyer wallet into escrow, creates an Order in PAID_ESCROW status, and
// notifies the seller via WhatsApp if linked.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { moveToEscrow } from "@/lib/wallet";
import { publish } from "@/lib/bid-bus";
import { tierRank, formatIDR } from "@/lib/utils";
import {
  broadcastToSellerGroups,
  phoneToJid,
  sendDirectMessage,
} from "@/lib/wa-client";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.isBlacklisted) {
    return NextResponse.json(
      { error: `Akun di-blacklist (${dbUser.blacklistReason ?? "MANUAL"})` },
      { status: 403 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: params.id },
        include: { koi: { include: { seller: { include: { user: true } } } } },
      });
      if (!auction) throw new Error("Lelang tidak ditemukan");
      if (auction.status === "ENDED" || auction.status === "CANCELLED") {
        throw new Error("Lelang sudah berakhir");
      }
      if (!auction.buyItNowPrice) {
        throw new Error("Lelang ini tidak mendukung Buy It Now");
      }
      if (auction.koi.seller.userId === user.id) {
        throw new Error("Seller tidak boleh membeli ikan sendiri");
      }
      if (auction.memberOnly && tierRank(user.membershipTier) < tierRank(auction.minTier)) {
        throw new Error(`Lelang eksklusif member ${auction.minTier}+`);
      }
      const binPrice = auction.buyItNowPrice;

      await moveToEscrow(tx, {
        userId: user.id,
        amount: binPrice,
        type: "ESCROW_HOLD",
        reference: auction.id,
        note: `BIN pembelian ${auction.koi.name}`,
      });

      const setting = await tx.platformSetting.findFirst();
      const feeBps = setting?.auctionFeeBps ?? 700;
      const feeAmount = Math.round((binPrice * feeBps) / 10_000);

      const updatedAuction = await tx.auction.update({
        where: { id: auction.id },
        data: {
          status: "ENDED",
          currentBid: binPrice,
          winnerId: user.id,
          winningBid: binPrice,
          boughtViaBin: true,
          endTime: new Date(),
          liveActive: false,
        },
      });
      await tx.koi.update({
        where: { id: auction.koiId },
        data: { status: "SOLD" },
      });
      const order = await tx.order.create({
        data: {
          koiId: auction.koiId,
          buyerId: user.id,
          amount: binPrice,
          feeAmount,
          status: "PAID_ESCROW",
          paymentRef: `BIN-${auction.id}`,
          sourceAuctionId: auction.id,
        },
      });
      return { updatedAuction, order, koi: auction.koi, binPrice, feeAmount };
    });

    publish({
      type: "status",
      auctionId: params.id,
      status: "ENDED",
      at: new Date().toISOString(),
    });

    // Best-effort WA notifications.
    const sellerGroupId = result.koi.seller.whatsappGroupId;
    const sellerPhone = result.koi.seller.user.whatsappNumber;
    const buyerName = user.name ?? "Pembeli";
    const text =
      `💎 *BUY IT NOW*\n` +
      `Ikan: ${result.koi.name}\n` +
      `Harga: ${formatIDR(result.binPrice)}\n` +
      `Pembeli: ${buyerName}\n` +
      `Order: ${result.order.id}`;
    void (async () => {
      if (sellerGroupId) await broadcastToSellerGroups([sellerGroupId], text);
      if (sellerPhone) await sendDirectMessage(phoneToJid(sellerPhone), text);
    })();

    return NextResponse.json({
      ok: true,
      orderId: result.order.id,
      amount: result.binPrice,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal Buy It Now";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
