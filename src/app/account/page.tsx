import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, LayoutDashboard, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatIDR, TIER_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/account");

  const [fresh, orders, bids, watchlist] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.order.findMany({
      where: { buyerId: user.id },
      include: { koi: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.bid.findMany({
      where: { userId: user.id },
      include: { auction: { include: { koi: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.watchlist.findMany({
      where: { userId: user.id },
      include: { koi: true },
      take: 10,
    }),
  ]);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Akun</p>
        <h1 className="heading-display text-3xl text-white">{fresh?.name}</h1>
        <p className="text-sm text-koi-muted">{fresh?.email}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="chip">Role: {fresh?.role}</span>
          <span className="chip-gold">
            <Crown size={10} /> Membership: {TIER_LABEL[fresh?.membershipTier ?? "NONE"]}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/membership" className="card p-4 transition hover:border-koi-gold/40">
          <Crown className="text-koi-gold" size={18} />
          <p className="mt-2 font-medium text-white">Upgrade Membership</p>
          <p className="text-xs text-koi-muted">Akses lelang eksklusif, diskon fee</p>
        </Link>
        {user.sellerId && (
          <Link href="/seller" className="card p-4 transition hover:border-koi-gold/40">
            <LayoutDashboard className="text-koi-gold" size={18} />
            <p className="mt-2 font-medium text-white">Seller Dashboard</p>
            <p className="text-xs text-koi-muted">Kelola listing & lelang</p>
          </Link>
        )}
        {user.role === "ADMIN" && (
          <Link href="/admin" className="card p-4 transition hover:border-koi-gold/40">
            <ShieldCheck className="text-koi-gold" size={18} />
            <p className="mt-2 font-medium text-white">Admin Panel</p>
            <p className="text-xs text-koi-muted">Super admin control</p>
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Order Terbaru</p>
          {orders.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada order.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {orders.map((o) => (
                <div key={o.id} className="py-2 text-sm">
                  <p className="font-medium text-white">{o.koi.name}</p>
                  <p className="text-xs text-koi-muted">
                    {formatIDR(o.amount)} • {o.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Bid Anda</p>
          {bids.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum pernah bid.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {bids.map((b) => (
                <div key={b.id} className="py-2 text-sm">
                  <p className="font-medium text-white">{b.auction.koi.name}</p>
                  <p className="text-xs text-koi-muted">
                    {formatIDR(b.amount)} • {b.createdAt.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 card p-4">
        <p className="mb-3 font-medium text-white">Watchlist</p>
        {watchlist.length === 0 ? (
          <p className="text-sm text-koi-muted">Belum ada koi di watchlist.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            {watchlist.map((w) => (
              <Link
                key={w.id}
                href={`/marketplace/${w.koi.slug}`}
                className="rounded-lg border border-koi-border bg-koi-ink/60 p-3 text-sm text-white hover:border-koi-gold/40"
              >
                {w.koi.name}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
