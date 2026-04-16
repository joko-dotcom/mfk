import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateWallet } from "@/lib/wallet";
import { WithdrawForm } from "@/components/wallet-forms";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WithdrawPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/wallet/withdraw");
  const [wallet, setting] = await Promise.all([
    getOrCreateWallet(user.id),
    prisma.platformSetting.findFirst(),
  ]);
  return (
    <div className="container-page py-10">
      <p className="text-xs uppercase tracking-widest text-koi-muted">Wallet</p>
      <h1 className="heading-display text-3xl text-white">Tarik Saldo</h1>
      <p className="mt-1 max-w-2xl text-sm text-koi-muted">
        Saldo tersedia:{" "}
        <span className="text-koi-gold">{formatIDR(wallet.availableBalance)}</span>. Minimal
        penarikan {formatIDR(setting?.withdrawalMinIDR ?? 50_000)} dengan biaya admin{" "}
        {formatIDR(setting?.withdrawalFeeIDR ?? 5_000)} per transaksi. Admin akan memverifikasi
        & mentransfer ke rekening Anda.
      </p>
      <div className="mt-6 max-w-xl">
        <WithdrawForm
          available={wallet.availableBalance}
          minIDR={setting?.withdrawalMinIDR ?? 50_000}
          feeIDR={setting?.withdrawalFeeIDR ?? 5_000}
        />
      </div>
    </div>
  );
}
