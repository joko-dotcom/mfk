import { redirect } from "next/navigation";
import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  formatIDR,
  DEPOSIT_STATUS_LABEL,
  WITHDRAWAL_STATUS_LABEL,
} from "@/lib/utils";
import {
  DepositApproveButtons,
  WithdrawalApproveButtons,
} from "@/components/admin-wallet-actions";

export const dynamic = "force-dynamic";

export default async function AdminWalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/admin/wallet");
  if (user.role !== "ADMIN") redirect("/");

  const [pendingDeposits, recentDeposits, pendingWithdrawals, recentWithdrawals, agg] =
    await Promise.all([
      prisma.depositRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.depositRequest.findMany({
        where: { status: { in: ["APPROVED", "REJECTED"] } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      }),
      prisma.withdrawalRequest.findMany({
        where: { status: { in: ["PENDING", "APPROVED"] } },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.withdrawalRequest.findMany({
        where: { status: { in: ["PAID", "REJECTED"] } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      }),
      prisma.wallet.aggregate({
        _sum: {
          availableBalance: true,
          escrowBalance: true,
          sellerDepositBalance: true,
        },
      }),
    ]);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Admin</p>
        <h1 className="heading-display text-3xl text-white">
          <Wallet size={22} className="mr-2 inline text-koi-gold" /> Payment &amp; Escrow
        </h1>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label="Total Saldo Available"
          value={formatIDR(agg._sum.availableBalance ?? 0)}
        />
        <Stat
          label="Total Escrow"
          value={formatIDR(agg._sum.escrowBalance ?? 0)}
          tone="gold"
        />
        <Stat
          label="Seller Deposits"
          value={formatIDR(agg._sum.sellerDepositBalance ?? 0)}
        />
      </div>

      <section className="mt-8 card p-4">
        <p className="mb-3 flex items-center gap-2 font-medium text-white">
          <Clock size={16} className="text-koi-gold" /> Deposit Pending (
          {pendingDeposits.length})
        </p>
        {pendingDeposits.length === 0 ? (
          <p className="text-sm text-koi-muted">Tidak ada deposit pending.</p>
        ) : (
          <div className="divide-y divide-koi-border">
            {pendingDeposits.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white">
                    {d.user.name}{" "}
                    <span className="text-koi-muted">({d.user.email})</span>
                  </p>
                  <p className="text-xs text-koi-muted">
                    {formatIDR(d.amount)} • {d.purpose} • {d.method} •{" "}
                    {new Date(d.createdAt).toLocaleString("id-ID")}
                  </p>
                  {d.note && <p className="text-xs text-koi-muted">Note: {d.note}</p>}
                </div>
                <DepositApproveButtons id={d.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 card p-4">
        <p className="mb-3 flex items-center gap-2 font-medium text-white">
          <CheckCircle2 size={16} className="text-koi-gold" /> Deposit Selesai
        </p>
        {recentDeposits.length === 0 ? (
          <p className="text-sm text-koi-muted">Belum ada histori.</p>
        ) : (
          <div className="divide-y divide-koi-border text-xs">
            {recentDeposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2">
                <p className="text-white">
                  {d.user.name} • {formatIDR(d.amount)} • {d.purpose}
                </p>
                <span
                  className={
                    d.status === "APPROVED" ? "text-koi-gold" : "text-koi-red"
                  }
                >
                  {DEPOSIT_STATUS_LABEL[d.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 card p-4">
        <p className="mb-3 flex items-center gap-2 font-medium text-white">
          <Clock size={16} className="text-koi-gold" /> Withdrawal Pending (
          {pendingWithdrawals.length})
        </p>
        {pendingWithdrawals.length === 0 ? (
          <p className="text-sm text-koi-muted">Tidak ada penarikan pending.</p>
        ) : (
          <div className="divide-y divide-koi-border">
            {pendingWithdrawals.map((w) => (
              <div key={w.id} className="py-3 text-sm">
                <p className="font-medium text-white">
                  {w.user.name}{" "}
                  <span className="text-koi-muted">({w.user.email})</span>
                </p>
                <p className="text-xs text-koi-muted">
                  {formatIDR(w.amount)} → {w.bankName} {w.bankAccount} a/n{" "}
                  {w.accountName} • fee {formatIDR(w.feeAmount)} • net{" "}
                  {formatIDR(w.netAmount)} • {w.status}
                </p>
                <WithdrawalApproveButtons id={w.id} status={w.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 card p-4">
        <p className="mb-3 flex items-center gap-2 font-medium text-white">
          <CheckCircle2 size={16} className="text-koi-gold" /> Withdrawal Selesai
        </p>
        {recentWithdrawals.length === 0 ? (
          <p className="text-sm text-koi-muted">Belum ada histori.</p>
        ) : (
          <div className="divide-y divide-koi-border text-xs">
            {recentWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2">
                <p className="text-white">
                  {w.user.name} • {formatIDR(w.amount)} → {w.bankName}
                </p>
                <span
                  className={
                    w.status === "PAID" ? "text-koi-gold" : "text-koi-red"
                  }
                >
                  {WITHDRAWAL_STATUS_LABEL[w.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold";
}) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-widest text-koi-muted">{label}</p>
      <p
        className={
          "mt-2 font-display text-2xl " + (tone === "gold" ? "gold-text" : "text-white")
        }
      >
        {value}
      </p>
    </div>
  );
}
