import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserAdminActions } from "@/components/admin-user-actions";
import { TIER_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/admin/users");
  if (user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { seller: { select: { farmName: true, verified: true } } },
  });

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Admin</p>
        <h1 className="heading-display text-3xl text-white">
          <Users size={22} className="mr-2 inline text-koi-gold" /> User Management
        </h1>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-koi-border text-xs uppercase text-koi-muted">
            <tr>
              <th className="p-3 text-left">Nama</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Tier</th>
              <th className="p-3 text-left">Seller</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">BNR</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-koi-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 text-white">{u.name}</td>
                <td className="p-3 text-koi-muted">{u.email}</td>
                <td className="p-3 text-koi-muted">{u.role}</td>
                <td className="p-3 text-koi-muted">{TIER_LABEL[u.membershipTier]}</td>
                <td className="p-3 text-koi-muted">
                  {u.seller
                    ? `${u.seller.farmName}${u.seller.verified ? " ✓" : ""}`
                    : "—"}
                </td>
                <td
                  className={
                    "p-3 " + (u.isBlacklisted ? "text-koi-red" : "text-koi-gold")
                  }
                >
                  {u.isBlacklisted ? "Blocked" : "Active"}
                </td>
                <td className="p-3 text-koi-muted">{u.bidAndRunCount}</td>
                <td className="p-3 text-right">
                  {u.role !== "ADMIN" && (
                    <UserAdminActions id={u.id} banned={u.isBlacklisted} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
