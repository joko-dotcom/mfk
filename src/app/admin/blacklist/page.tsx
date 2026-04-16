import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserAdminActions } from "@/components/admin-user-actions";

export const dynamic = "force-dynamic";

export default async function AdminBlacklistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/admin/blacklist");
  if (user.role !== "ADMIN") redirect("/");

  const [blacklisted, strikers, recentStrikes] = await Promise.all([
    prisma.user.findMany({
      where: { isBlacklisted: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        bidAndRunCount: true,
        blacklistReason: true,
        blacklistNote: true,
        updatedAt: true,
      },
    }),
    prisma.user.findMany({
      where: { bidAndRunCount: { gt: 0 }, isBlacklisted: false },
      orderBy: { bidAndRunCount: "desc" },
      select: { id: true, name: true, email: true, bidAndRunCount: true },
      take: 50,
    }),
    prisma.blacklistStrike.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Admin</p>
        <h1 className="heading-display text-3xl text-white">
          <ShieldAlert size={22} className="mr-2 inline text-koi-red" /> Fraud &amp; BNR
        </h1>
        <p className="mt-1 text-sm text-koi-muted">
          Monitoring Bid &amp; Run strikes dan blacklist pelanggar.
        </p>
      </div>

      <section className="card p-4">
        <p className="mb-3 font-medium text-white">Akun Diblokir ({blacklisted.length})</p>
        {blacklisted.length === 0 ? (
          <p className="text-sm text-koi-muted">Tidak ada akun diblokir.</p>
        ) : (
          <div className="divide-y divide-koi-border">
            {blacklisted.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">
                    {u.name}{" "}
                    <span className="text-koi-muted">({u.email})</span>
                  </p>
                  <p className="text-xs text-koi-muted">
                    Alasan: <span className="text-koi-red">{u.blacklistReason}</span>{" "}
                    • BNR: {u.bidAndRunCount}x{" "}
                    {u.blacklistNote ? `• ${u.blacklistNote}` : ""}
                  </p>
                </div>
                <UserAdminActions id={u.id} banned={true} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 card p-4">
        <p className="mb-3 font-medium text-white">Strikers (BNR Count &gt; 0)</p>
        {strikers.length === 0 ? (
          <p className="text-sm text-koi-muted">Tidak ada striker saat ini.</p>
        ) : (
          <div className="divide-y divide-koi-border">
            {strikers.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">
                    {u.name}{" "}
                    <span className="text-koi-muted">({u.email})</span>
                  </p>
                  <p className="text-xs text-koi-muted">BNR count: {u.bidAndRunCount}</p>
                </div>
                <UserAdminActions id={u.id} banned={false} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 card p-4">
        <p className="mb-3 font-medium text-white">Strike Log</p>
        {recentStrikes.length === 0 ? (
          <p className="text-sm text-koi-muted">Belum ada strike.</p>
        ) : (
          <div className="divide-y divide-koi-border">
            {recentStrikes.map((s) => (
              <div key={s.id} className="py-2 text-xs">
                <p className="text-white">
                  {s.user.name} • {s.reason} •{" "}
                  <span className="text-koi-muted">
                    {new Date(s.createdAt).toLocaleString("id-ID")}
                  </span>
                </p>
                {s.note && <p className="text-koi-muted">{s.note}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
