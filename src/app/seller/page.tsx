import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Gavel,
  Plus,
  Fish,
  TrendingUp,
  Eye,
  BadgeCheck,
  Package,
  Home,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatIDR, CATEGORY_LABEL } from "@/lib/utils";

export default async function SellerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/seller");
  if (!user.sellerId) redirect("/seller/onboarding");

  const [seller, listings, orders, salesAgg] = await Promise.all([
    prisma.seller.findUnique({ where: { id: user.sellerId } }),
    prisma.koi.findMany({
      where: { sellerId: user.sellerId },
      include: { auction: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: { koi: { sellerId: user.sellerId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { koi: true, buyer: true },
    }),
    prisma.order.aggregate({
      where: { koi: { sellerId: user.sellerId }, status: { in: ["PAID_ESCROW","SHIPPED","DELIVERED","RELEASED"] } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalListings = listings.length;
  const activeListings = listings.filter((l) => l.status === "ACTIVE").length;
  const totalViews = listings.reduce((s, l) => s + l.viewCount, 0);

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-koi-muted">Seller Dashboard</p>
          <h1 className="heading-display text-3xl text-white">
            {seller?.farmName}
            {seller?.verified && <BadgeCheck size={20} className="ml-2 inline text-koi-gold" />}
          </h1>
          <p className="text-sm text-koi-muted">
            {seller?.location} • {seller?.province} • Status:{" "}
            <span className="text-white">{seller?.status}</span>
          </p>
        </div>
        <Link href="/seller/listings/new" className="btn-gold">
          <Plus size={14} /> Upload Koi
        </Link>
      </div>

      {!seller?.verified && (
        <div className="mb-6 card border-koi-gold/40 p-4 text-sm">
          <p className="font-medium text-koi-gold">Menunggu Verifikasi Admin</p>
          <p className="mt-1 text-koi-muted">
            Farm Anda sedang direview. Anda bisa upload koi dalam mode draft — listing baru
            dipublish setelah farm terverifikasi & listing disetujui admin.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Stat icon={<Fish size={16} />} label="Total Listing" value={String(totalListings)} />
        <Stat icon={<TrendingUp size={16} />} label="Aktif" value={String(activeListings)} />
        <Stat icon={<Eye size={16} />} label="Total Views" value={String(totalViews)} />
        <Stat
          icon={<Gavel size={16} />}
          label="Penjualan"
          value={formatIDR(salesAgg._sum.amount ?? 0)}
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Link href="/seller/kc" className="card p-4 transition hover:border-koi-gold/40">
          <Package size={16} className="text-koi-gold" />
          <p className="mt-2 font-medium text-white">KC / Titip Jual</p>
          <p className="text-xs text-koi-muted">
            Host konsinyasi koi hobbyist — fee otomatis dipotong saat laku.
          </p>
        </Link>
        <Link href="/seller/azukari" className="card p-4 transition hover:border-koi-gold/40">
          <Home size={16} className="text-koi-gold" />
          <p className="mt-2 font-medium text-white">Azukari</p>
          <p className="text-xs text-koi-muted">
            Kelola kontrak titip rawat koi bulanan.
          </p>
        </Link>
        <Link href="/wallet" className="card p-4 transition hover:border-koi-gold/40">
          <Wallet size={16} className="text-koi-gold" />
          <p className="mt-2 font-medium text-white">Wallet &amp; Deposit</p>
          <p className="text-xs text-koi-muted">
            Saldo tersedia, escrow, deposit jaminan.
          </p>
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-white">Koi Listings</p>
            <Link href="/seller/listings/new" className="text-xs text-koi-gold">
              + Tambah
            </Link>
          </div>
          {listings.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada listing. Upload koi pertama Anda.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {listings.map((k) => (
                <div key={k.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{k.name}</p>
                    <p className="text-xs text-koi-muted">
                      {CATEGORY_LABEL[k.category]} • {k.sizeCm} cm •{" "}
                      <span className="text-koi-gold">{formatIDR(k.auction?.currentBid ?? k.price)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={statusChip(k.status)}>{k.status}</span>
                    <Link href={`/marketplace/${k.slug}`} className="text-xs text-koi-platinum hover:underline">
                      Lihat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Pesanan Terbaru</p>
          {orders.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada pesanan.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {orders.map((o) => (
                <div key={o.id} className="py-3 text-sm">
                  <p className="font-medium text-white">{o.koi.name}</p>
                  <p className="text-xs text-koi-muted">
                    {o.buyer.name} • {formatIDR(o.amount)} • {o.status}
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-koi-gold">
        {icon}
        <p className="text-xs uppercase tracking-widest text-koi-muted">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl text-white">{value}</p>
    </div>
  );
}

function statusChip(status: string) {
  if (status === "ACTIVE") return "chip-gold";
  if (status === "PENDING_APPROVAL") return "chip";
  if (status === "SOLD") return "chip";
  return "chip-red";
}
