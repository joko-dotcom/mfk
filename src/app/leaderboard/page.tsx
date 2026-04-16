import Link from "next/link";
import { Crown, Gavel, TrendingUp, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatIDR, TIER_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function LeaderboardPage() {
  const [bidGroups, winGroups, orderGroups] = await Promise.all([
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
    }),
    prisma.order.groupBy({
      by: ["koiId"],
      where: { status: { in: ["PAID_ESCROW", "SHIPPED", "DELIVERED", "RELEASED"] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const userIds = Array.from(
    new Set([
      ...bidGroups.map((b) => b.userId),
      ...winGroups.map((w) => w.winnerId).filter((x): x is string => Boolean(x)),
    ]),
  );
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, membershipTier: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topBidders = bidGroups
    .map((b) => {
      const u = userMap.get(b.userId);
      const wins = winGroups.find((w) => w.winnerId === b.userId);
      return {
        userId: b.userId,
        name: u?.name ?? "Unknown",
        tier: u?.membershipTier ?? "NONE",
        bidCount: b._count._all,
        volume: b._sum.amount ?? 0,
        wins: wins?._count._all ?? 0,
        winVolume: wins?._sum.winningBid ?? 0,
      };
    })
    .sort((a, b) => b.wins - a.wins || b.bidCount - a.bidCount)
    .slice(0, 10);

  // Aggregate top sellers by koi → seller
  const koiIds = orderGroups.map((g) => g.koiId);
  const kois = await prisma.koi.findMany({
    where: { id: { in: koiIds } },
    select: { id: true, sellerId: true },
  });
  const sellerIdByKoi = new Map(kois.map((k) => [k.id, k.sellerId]));
  const sellerAgg = new Map<string, { omzet: number; sales: number }>();
  for (const g of orderGroups) {
    const sid = sellerIdByKoi.get(g.koiId);
    if (!sid) continue;
    const prev = sellerAgg.get(sid) ?? { omzet: 0, sales: 0 };
    prev.omzet += g._sum.amount ?? 0;
    prev.sales += g._count._all;
    sellerAgg.set(sid, prev);
  }
  const sellers = await prisma.seller.findMany({
    where: { id: { in: Array.from(sellerAgg.keys()) } },
    select: { id: true, farmName: true, slug: true, province: true, rating: true, verified: true },
  });
  const topSellers = sellers
    .map((s) => ({
      ...s,
      omzet: sellerAgg.get(s.id)?.omzet ?? 0,
      sales: sellerAgg.get(s.id)?.sales ?? 0,
    }))
    .sort((a, b) => b.omzet - a.omzet)
    .slice(0, 10);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Leaderboard</p>
        <h1 className="heading-display text-3xl text-white">
          <Trophy size={24} className="mr-2 inline text-koi-gold" />
          Hall of Fame
        </h1>
        <p className="mt-1 text-sm text-koi-muted">
          Top bidder &amp; top seller berdasarkan aktivitas lelang tuntas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <p className="mb-3 flex items-center gap-2 font-medium text-white">
            <Gavel size={16} className="text-koi-gold" /> Top Bidder
          </p>
          {topBidders.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada data bid.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {topBidders.map((b, i) => (
                <div key={b.userId} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right font-display text-koi-gold">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-white">{b.name}</p>
                      <p className="text-xs text-koi-muted">
                        {b.bidCount} bid • {b.wins} menang •{" "}
                        <Crown size={10} className="inline text-koi-gold" />{" "}
                        {TIER_LABEL[b.tier]}
                      </p>
                    </div>
                  </div>
                  <p className="font-display text-koi-gold">{formatIDR(b.winVolume)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <p className="mb-3 flex items-center gap-2 font-medium text-white">
            <TrendingUp size={16} className="text-koi-gold" /> Top Seller
          </p>
          {topSellers.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada data penjualan.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {topSellers.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-right font-display text-koi-gold">#{i + 1}</span>
                    <div>
                      <Link
                        href={`/seller/${s.slug}`}
                        className="font-medium text-white hover:text-koi-gold"
                      >
                        {s.farmName}
                      </Link>
                      <p className="text-xs text-koi-muted">
                        {s.province} • {s.sales} penjualan • ★ {s.rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="font-display text-koi-gold">{formatIDR(s.omzet)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
