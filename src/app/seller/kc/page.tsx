import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatIDR } from "@/lib/utils";
import { ConsignmentActions, ConsignmentCreateForm } from "@/components/consignment-forms";

export const dynamic = "force-dynamic";

export default async function SellerKCPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/seller/kc");
  if (!user.sellerId) redirect("/seller/onboarding");

  const [hosted, verifiedSellers] = await Promise.all([
    prisma.consignmentListing.findMany({
      where: { hostSellerId: user.sellerId },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true, email: true } } },
    }),
    prisma.seller.findMany({
      where: { verified: true },
      select: { id: true, farmName: true, province: true },
      orderBy: { farmName: "asc" },
      take: 50,
    }),
  ]);

  const owned = await prisma.consignmentListing.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { hostSeller: { select: { farmName: true } } },
  });

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">KC / Consignment</p>
        <h1 className="heading-display text-3xl text-white">
          <Package size={22} className="mr-2 inline text-koi-gold" /> Titip Jual
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-koi-muted">
          Host koi milik hobbyist lain atau titipkan koi Anda ke farm lain. Fee platform otomatis
          dipotong saat terjual.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-white">Saya Jadi Host ({hosted.length})</p>
            <Link href="/marketplace" className="text-xs text-koi-gold">
              Lihat pasar →
            </Link>
          </div>
          {hosted.length === 0 ? (
            <p className="text-sm text-koi-muted">Belum ada request konsinyasi.</p>
          ) : (
            <div className="divide-y divide-koi-border">
              {hosted.map((item) => (
                <div key={item.id} className="py-3 text-sm">
                  <p className="font-medium text-white">
                    {item.koiName}{" "}
                    <span className="ml-2 text-xs text-koi-muted">{item.sizeCm}cm</span>
                  </p>
                  <p className="text-xs text-koi-muted">
                    Owner: {item.owner.name} • Ask: {formatIDR(item.askingPrice)} • Fee{" "}
                    {(item.feeBps / 100).toFixed(1)}% • Status:{" "}
                    <span className="text-white">{item.status}</span>
                  </p>
                  <ConsignmentActions id={item.id} status={item.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <p className="mb-3 font-medium text-white">Ajukan Titip Jual Koi Saya</p>
          <ConsignmentCreateForm sellers={verifiedSellers} />
        </section>
      </div>

      <section className="mt-6 card p-4">
        <p className="mb-3 font-medium text-white">Titipan Saya ({owned.length})</p>
        {owned.length === 0 ? (
          <p className="text-sm text-koi-muted">Anda belum pernah menitipkan koi.</p>
        ) : (
          <div className="divide-y divide-koi-border">
            {owned.map((item) => (
              <div key={item.id} className="py-3 text-sm">
                <p className="font-medium text-white">
                  {item.koiName}{" "}
                  <span className="ml-2 text-xs text-koi-muted">
                    @ {item.hostSeller.farmName}
                  </span>
                </p>
                <p className="text-xs text-koi-muted">
                  Ask: {formatIDR(item.askingPrice)} • Status:{" "}
                  <span className="text-white">{item.status}</span>
                  {item.soldPrice
                    ? ` • Terjual ${formatIDR(item.soldPrice)}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
