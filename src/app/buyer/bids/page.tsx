import Link from "next/link";
import { redirect } from "next/navigation";
import { Gavel } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BuyerBidsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/buyer/bids");

  const [bids, orders] = await Promise.all([
    prisma.bid.findMany({
      where: { userId: user.id },
      include: { auction: { include: { koi: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.order.findMany({
      where: { buyerId: user.id },
      include: { koi: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Buyer</p>
        <h1 className="heading-display text-3xl text-white">
          <Gavel size={22} className="mr-2 inline text-koi-gold" /> History Bid
        </h1>
        <p className="mt-1 text-sm text-koi-muted">
          Semua aktivitas bidding Anda lengkap dengan status order bila menang.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Bid Terbaru</p>
          {bids.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum pernah bid.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {bids.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <Link
                      href={`/auctions/${b.auctionId}`}
                      className="font-medium text-white hover:text-koi-gold"
                    >
                      {b.auction.koi.name}
                    </Link>
                    <p className="text-xs text-koi-muted">
                      {new Date(b.createdAt).toLocaleString("id-ID")} • {b.auction.status}
                    </p>
                  </div>
                  <p className="font-display text-koi-gold">{formatIDR(b.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Order Anda</p>
          {orders.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada order.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {orders.map((o) => (
                <div key={o.id} className="py-3 text-sm">
                  <p className="font-medium text-white">{o.koi.name}</p>
                  <p className="text-xs text-koi-muted">
                    {formatIDR(o.amount)} •{" "}
                    <span
                      className={
                        o.status === "DEFAULTED"
                          ? "text-koi-red"
                          : o.status === "RELEASED"
                            ? "text-koi-gold"
                            : ""
                      }
                    >
                      {o.status}
                    </span>
                    {o.paymentDueAt
                      ? ` • bayar sebelum ${new Date(o.paymentDueAt).toLocaleString("id-ID")}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
