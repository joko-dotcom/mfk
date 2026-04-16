import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { DepositForm } from "@/components/wallet-forms";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DepositPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/wallet/deposit");
  const setting =
    (await prisma.platformSetting.findFirst()) ??
    (await prisma.platformSetting.create({ data: {} }));
  const isSeller = Boolean(user.sellerId);
  return (
    <div className="container-page py-10">
      <p className="text-xs uppercase tracking-widest text-koi-muted">Wallet</p>
      <h1 className="heading-display text-3xl text-white">Top Up Deposit</h1>
      <p className="mt-1 max-w-2xl text-sm text-koi-muted">
        Buyer wajib deposit sebelum bid (min.{" "}
        <span className="text-koi-gold">{formatIDR(setting.minBuyerDepositIDR)}</span>).
        Seller bisa deposit jaminan (min.{" "}
        <span className="text-koi-gold">{formatIDR(setting.minSellerDepositIDR)}</span>).
        Saat ini semua deposit menggunakan MOCK payment (auto-approve) sehingga flow bisa
        diuji tanpa payment gateway.
      </p>
      <div className="mt-6 max-w-xl">
        <DepositForm
          allowSeller={isSeller}
          minBuyerIDR={setting.minBuyerDepositIDR}
          minSellerIDR={setting.minSellerDepositIDR}
        />
      </div>
    </div>
  );
}
