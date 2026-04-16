import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatIDR } from "@/lib/utils";
import { AzukariCreateForm, AzukariActions } from "@/components/azukari-forms";

export const dynamic = "force-dynamic";

export default async function SellerAzukariPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/seller/azukari");
  if (!user.sellerId) redirect("/seller/onboarding");

  const [hosted, sellers, setting, owned] = await Promise.all([
    prisma.azukariContract.findMany({
      where: { hostSellerId: user.sellerId },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true } } },
    }),
    prisma.seller.findMany({
      where: { verified: true },
      select: { id: true, farmName: true, province: true },
      orderBy: { farmName: "asc" },
      take: 50,
    }),
    prisma.platformSetting.findFirst(),
    prisma.azukariContract.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      include: { hostSeller: { select: { farmName: true } } },
    }),
  ]);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Azukari</p>
        <h1 className="heading-display text-3xl text-white">
          <Home size={22} className="mr-2 inline text-koi-gold" /> Titip Rawat
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-koi-muted">
          Program karantina &amp; perawatan bulanan. Monthly fee default{" "}
          {formatIDR(setting?.azukariMonthlyFeeIDR ?? 250_000)} / ikan — bisa disesuaikan per kontrak.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Saya Jadi Host ({hosted.length})</p>
          {hosted.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada kontrak azukari aktif.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {hosted.map((a) => (
                <div key={a.id} className="py-3 text-sm">
                  <p className="font-medium text-white">
                    {a.koiName}{" "}
                    <span className="ml-2 text-xs text-koi-muted">{a.sizeCm}cm</span>
                  </p>
                  <p className="text-xs text-koi-muted">
                    Owner: {a.owner.name} • {formatIDR(a.monthlyFeeIDR)} / bulan • Status:{" "}
                    <span className="text-white">{a.status}</span>
                  </p>
                  <AzukariActions id={a.id} status={a.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Daftarkan Koi untuk Azukari</p>
          <AzukariCreateForm
            sellers={sellers}
            defaultMonthlyFee={setting?.azukariMonthlyFeeIDR ?? 250_000}
          />
        </section>
      </div>

      <section className="mt-6 card p-4">
        <p className="mb-3 font-medium text-white">Azukari Saya ({owned.length})</p>
        {owned.length === 0 ? (
          <p className="text-sm text-koi-muted">Belum ada ikan yang dititipkan.</p>
        ) : (
          <div className="divide-y divide-koi-border">
            {owned.map((a) => (
              <div key={a.id} className="py-3 text-sm">
                <p className="font-medium text-white">
                  {a.koiName}{" "}
                  <span className="ml-2 text-xs text-koi-muted">
                    @ {a.hostSeller.farmName}
                  </span>
                </p>
                <p className="text-xs text-koi-muted">
                  {formatIDR(a.monthlyFeeIDR)} / bulan • Status:{" "}
                  <span className="text-white">{a.status}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
