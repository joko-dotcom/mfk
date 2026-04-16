import { redirect } from "next/navigation";
import { Users, Fish, Gavel, DollarSign, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AdminActions } from "@/components/admin-actions";
import { formatIDR, CATEGORY_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/");

  const [pendingSellers, pendingKoi, activeKoi, activeAuctions, users, orders, salesAgg] =
    await Promise.all([
      prisma.seller.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { user: true },
      }),
      prisma.koi.findMany({
        where: { status: "PENDING_APPROVAL" },
        orderBy: { createdAt: "desc" },
        include: { seller: true },
      }),
      prisma.koi.count({ where: { status: "ACTIVE" } }),
      prisma.auction.count({ where: { status: { in: ["SCHEDULED", "LIVE"] } } }),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: { in: ["PAID_ESCROW", "SHIPPED", "DELIVERED", "RELEASED"] } },
        _sum: { amount: true, feeAmount: true },
      }),
    ]);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Super Admin</p>
        <h1 className="heading-display text-3xl text-white">Admin Panel</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat icon={<Users size={16} />} label="Total Users" value={String(users)} />
        <Stat icon={<Fish size={16} />} label="Listing Aktif" value={String(activeKoi)} />
        <Stat icon={<Gavel size={16} />} label="Lelang Aktif" value={String(activeAuctions)} />
        <Stat
          icon={<DollarSign size={16} />}
          label="GMV"
          value={formatIDR(salesAgg._sum.amount ?? 0)}
        />
      </div>

      <div className="mt-4 card p-4">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Platform Fee (est.)</p>
        <p className="font-display text-2xl text-koi-gold">
          {formatIDR(salesAgg._sum.feeAmount ?? 0)}
        </p>
        <p className="text-xs text-koi-muted">dari {orders} order</p>
      </div>

      <section className="mt-8">
        <h2 className="heading-display mb-3 text-xl text-white">
          Seller Menunggu Verifikasi ({pendingSellers.length})
        </h2>
        <div className="card divide-y divide-koi-border">
          {pendingSellers.length === 0 ? (
            <p className="p-6 text-sm text-koi-muted">Tidak ada seller pending.</p>
          ) : (
            pendingSellers.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
              >
                <div>
                  <p className="font-medium text-white">
                    {s.farmName}
                    <BadgeCheck size={12} className="ml-1 inline text-koi-muted" />
                  </p>
                  <p className="text-xs text-koi-muted">
                    {s.user.name} • {s.user.email} • {s.location}, {s.province}
                  </p>
                </div>
                <AdminActions
                  kind="seller"
                  id={s.id}
                  actions={["verify", "reject"]}
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="heading-display mb-3 text-xl text-white">
          Listing Menunggu Approval ({pendingKoi.length})
        </h2>
        <div className="card divide-y divide-koi-border">
          {pendingKoi.length === 0 ? (
            <p className="p-6 text-sm text-koi-muted">Tidak ada listing pending.</p>
          ) : (
            pendingKoi.map((k) => (
              <div
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{k.name}</p>
                  <p className="text-xs text-koi-muted">
                    {CATEGORY_LABEL[k.category]} • {k.sizeCm}cm • {formatIDR(k.price)} •{" "}
                    {k.seller.farmName}
                  </p>
                </div>
                <AdminActions
                  kind="koi"
                  id={k.id}
                  actions={["approve", "reject"]}
                />
              </div>
            ))
          )}
        </div>
      </section>
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
