import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Wallet, Clock, Lock, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateWallet } from "@/lib/wallet";
import {
  formatIDR,
  WALLET_TX_LABEL,
  DEPOSIT_STATUS_LABEL,
  WITHDRAWAL_STATUS_LABEL,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/wallet");

  const [wallet, txs, deposits, withdrawals] = await Promise.all([
    getOrCreateWallet(user.id),
    prisma.walletTx.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.depositRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-koi-muted">Wallet</p>
          <h1 className="heading-display text-3xl text-white">Saldo & Escrow</h1>
          <p className="mt-1 text-sm text-koi-muted">
            Top up sebelum bid, pantau escrow kemenangan Anda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/wallet/deposit" className="btn-gold">
            <ArrowDownToLine size={14} /> Top Up Deposit
          </Link>
          <Link href="/wallet/withdraw" className="btn-ghost">
            <ArrowUpFromLine size={14} /> Tarik Saldo
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label="Saldo Tersedia"
          value={formatIDR(wallet.availableBalance)}
          icon={<Wallet size={16} />}
          hint="Siap untuk bidding & pembelian"
          tone="gold"
        />
        <Stat
          label="Saldo Escrow"
          value={formatIDR(wallet.escrowBalance)}
          icon={<Lock size={16} />}
          hint="Ditahan untuk order yang sedang diproses"
        />
        <Stat
          label={user.sellerId ? "Deposit Seller" : "Total Diterima"}
          value={formatIDR(user.sellerId ? wallet.sellerDepositBalance : wallet.totalEarned)}
          icon={<Sparkles size={16} />}
          hint={user.sellerId ? "Jaminan farm (dipotong jika melanggar)" : "Akumulasi payout"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Riwayat Transaksi Wallet</p>
          {txs.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada transaksi.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {txs.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-white">
                      {WALLET_TX_LABEL[t.type] ?? t.type}
                    </p>
                    <p className="text-xs text-koi-muted">
                      {new Date(t.createdAt).toLocaleString("id-ID")}
                      {t.note ? ` • ${t.note}` : ""}
                    </p>
                  </div>
                  <p
                    className={
                      t.amount >= 0
                        ? "font-display text-koi-gold"
                        : "font-display text-koi-red"
                    }
                  >
                    {t.amount >= 0 ? "+" : ""}
                    {formatIDR(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="card p-4">
            <p className="mb-3 flex items-center gap-2 font-medium text-white">
              <Clock size={14} /> Riwayat Top Up
            </p>
            {deposits.length === 0 ? (
              <p className="text-sm text-koi-muted">Belum ada top-up.</p>
            ) : (
              <div className="divide-y divide-koi-border">
                {deposits.map((d) => (
                  <div key={d.id} className="py-2 text-xs">
                    <p className="font-medium text-white">
                      {formatIDR(d.amount)}{" "}
                      <span className="text-koi-muted">({d.purpose === "SELLER" ? "seller" : "buyer"})</span>
                    </p>
                    <p className="text-koi-muted">
                      {new Date(d.createdAt).toLocaleString("id-ID")} •{" "}
                      <span
                        className={
                          d.status === "APPROVED"
                            ? "text-koi-gold"
                            : d.status === "REJECTED"
                              ? "text-koi-red"
                              : ""
                        }
                      >
                        {DEPOSIT_STATUS_LABEL[d.status]}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="mb-3 flex items-center gap-2 font-medium text-white">
              <Clock size={14} /> Riwayat Penarikan
            </p>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-koi-muted">Belum ada penarikan.</p>
            ) : (
              <div className="divide-y divide-koi-border">
                {withdrawals.map((w) => (
                  <div key={w.id} className="py-2 text-xs">
                    <p className="font-medium text-white">
                      {formatIDR(w.amount)} → {w.bankName} {w.bankAccount}
                    </p>
                    <p className="text-koi-muted">
                      {new Date(w.createdAt).toLocaleString("id-ID")} •{" "}
                      <span
                        className={
                          w.status === "PAID"
                            ? "text-koi-gold"
                            : w.status === "REJECTED"
                              ? "text-koi-red"
                              : ""
                        }
                      >
                        {WITHDRAWAL_STATUS_LABEL[w.status]}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  hint,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
  tone?: "gold";
}) {
  return (
    <div className="card p-4">
      <div className={"flex items-center gap-2 " + (tone === "gold" ? "text-koi-gold" : "text-koi-platinum")}>
        {icon}
        <p className="text-xs uppercase tracking-widest text-koi-muted">{label}</p>
      </div>
      <p
        className={
          "mt-2 font-display text-2xl " + (tone === "gold" ? "gold-text" : "text-white")
        }
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-koi-muted">{hint}</p>}
    </div>
  );
}
