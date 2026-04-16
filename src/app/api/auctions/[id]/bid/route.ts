import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { publish } from "@/lib/bid-bus";
import { tierRank, formatIDR } from "@/lib/utils";
import { getOrCreateWallet } from "@/lib/wallet";

const schema = z.object({ amount: z.number().int().positive() });

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const { amount } = parsed.data;

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser?.isBlacklisted) {
      return NextResponse.json(
        { error: `Akun di-blacklist (${dbUser.blacklistReason ?? "MANUAL"})` },
        { status: 403 },
      );
    }
    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: params.id },
        include: { koi: { include: { seller: true } } },
      });
      if (!auction) throw new Error("Lelang tidak ditemukan");
      if (auction.status !== "SCHEDULED" && auction.status !== "LIVE") {
        throw new Error("Lelang sudah berakhir");
      }
      const now = new Date();
      if (now > auction.endTime) {
        throw new Error("Lelang sudah berakhir");
      }
      if (now < auction.startTime) {
        throw new Error("Lelang belum dimulai");
      }
      if (auction.koi.seller.userId === user.id) {
        throw new Error("Seller tidak boleh bid di lelang sendiri");
      }
      if (auction.memberOnly && tierRank(user.membershipTier) < tierRank(auction.minTier)) {
        throw new Error(`Lelang eksklusif member ${auction.minTier}+`);
      }
      // KB (kelipatan bid): harus kelipatan bidStep dari startingBid
      if (auction.kind === "KB" && auction.bidStep) {
        if ((amount - auction.startingBid) % auction.bidStep !== 0) {
          throw new Error(
            `Bid harus kelipatan ${formatIDR(auction.bidStep)} dari starting bid`,
          );
        }
      }
      // BIN-only auction can't be bid
      if (auction.kind === "BIN") {
        throw new Error("Lelang BIN: gunakan tombol Buy It Now");
      }
      const minNext = Math.max(
        auction.currentBid + auction.minIncrement,
        auction.startingBid + auction.minIncrement,
      );
      if (amount < minNext) {
        throw new Error(`Bid minimal ${formatIDR(minNext)}`);
      }
      // Wallet gate: bidder must have enough available balance to cover bid.
      const wallet = await getOrCreateWallet(user.id, tx);
      if (wallet.availableBalance < amount) {
        throw new Error(
          `Saldo deposit tidak cukup. Tersedia ${formatIDR(wallet.availableBalance)}, bid ${formatIDR(amount)}. Top up dulu di /wallet/deposit.`,
        );
      }

      // Anti-sniper: extend endTime if bid in last N minutes.
      const extendThreshold = new Date(
        auction.endTime.getTime() - auction.antiSniperMinutes * 60_000,
      );
      const newEndTime =
        now > extendThreshold
          ? new Date(now.getTime() + auction.antiSniperMinutes * 60_000)
          : auction.endTime;

      const updated = await tx.auction.update({
        where: { id: auction.id },
        data: {
          currentBid: amount,
          endTime: newEndTime,
          status: "LIVE",
        },
      });
      const bid = await tx.bid.create({
        data: {
          auctionId: auction.id,
          userId: user.id,
          amount,
        },
      });
      return { auction: updated, bid };
    });

    publish({
      type: "bid",
      auctionId: params.id,
      amount: result.auction.currentBid,
      userName: user.name ?? "Bidder",
      userId: user.id,
      endTime: result.auction.endTime.toISOString(),
      at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, currentBid: result.auction.currentBid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal bid";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
