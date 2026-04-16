import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  // Top bidders: ranked by total bids placed + wins.
  const [bidGroups, winGroups, sellerGroups] = await Promise.all([
    prisma.bid.groupBy({
      by: ["userId"],
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { _count: { userId: "desc" } },
      take: 20,
    }),
    prisma.auction.groupBy({
      by: ["winnerId"],
      where: { winnerId: { not: null }, status: "ENDED" },
      _count: { _all: true },
      _sum: { winningBid: true },
      orderBy: { _count: { winnerId: "desc" } },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ["koiId"],
      where: { status: { in: ["PAID_ESCROW", "SHIPPED", "DELIVERED", "RELEASED"] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const bidderIds = bidGroups.map((b) => b.userId);
  const winnerIds = winGroups.map((w) => w.winnerId).filter((x): x is string => Boolean(x));
  const allUserIds = Array.from(new Set([...bidderIds, ...winnerIds]));
  const users = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, name: true, membershipTier: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topBidders = bidGroups
    .map((b) => {
      const u = userMap.get(b.userId);
      const wins = winGroups.find((w) => w.winnerId === b.userId);
      return {
        userId: b.userId,
        name: u?.name ?? "Unknown",
        membershipTier: u?.membershipTier ?? "NONE",
        bidCount: b._count._all,
        bidVolume: b._sum.amount ?? 0,
        winCount: wins?._count._all ?? 0,
        winVolume: wins?._sum.winningBid ?? 0,
      };
    })
    .sort((a, b) => b.bidCount + b.winCount * 3 - (a.bidCount + a.winCount * 3));

  // Top sellers: aggregate orders by koi → seller.
  const koiIds = sellerGroups.map((g) => g.koiId);
  const kois = await prisma.koi.findMany({
    where: { id: { in: koiIds } },
    select: { id: true, sellerId: true },
  });
  const sellerIdByKoi = new Map(kois.map((k) => [k.id, k.sellerId]));
  const sellerAgg = new Map<string, { omzet: number; sales: number }>();
  for (const g of sellerGroups) {
    const sid = sellerIdByKoi.get(g.koiId);
    if (!sid) continue;
    const prev = sellerAgg.get(sid) ?? { omzet: 0, sales: 0 };
    prev.omzet += g._sum.amount ?? 0;
    prev.sales += g._count._all;
    sellerAgg.set(sid, prev);
  }
  const sellers = await prisma.seller.findMany({
    where: { id: { in: Array.from(sellerAgg.keys()) } },
    select: { id: true, farmName: true, slug: true, province: true, rating: true },
  });
  const topSellers = sellers
    .map((s) => ({
      sellerId: s.id,
      farmName: s.farmName,
      slug: s.slug,
      province: s.province,
      rating: s.rating,
      omzet: sellerAgg.get(s.id)?.omzet ?? 0,
      sales: sellerAgg.get(s.id)?.sales ?? 0,
    }))
    .sort((a, b) => b.omzet - a.omzet)
    .slice(0, 20);

  return NextResponse.json({ topBidders, topSellers });
}
