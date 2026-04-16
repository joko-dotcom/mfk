import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { KoiCard, type KoiCardData } from "@/components/koi-card";

export const dynamic = "force-dynamic";

export default async function SellerPage({ params }: { params: { slug: string } }) {
  const seller = await prisma.seller
    .findUnique({
      where: { slug: params.slug },
      include: {
        listings: {
          where: { status: "ACTIVE" },
          include: { seller: true, auction: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })
    .catch(() => null);

  if (!seller) notFound();

  return (
    <div>
      <section className="border-b border-koi-border bg-koi-ink/60 py-10">
        <div className="container-page flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-koi-gold/40 bg-koi-panel">
              {seller.farmPhotoUrl ? (
                <Image src={seller.farmPhotoUrl} alt={seller.farmName} fill sizes="80px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-koi-gold">
                  <Users size={24} />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-koi-muted">Farm</p>
              <h1 className="font-display text-3xl text-white">
                {seller.farmName}
                {seller.verified && (
                  <BadgeCheck size={18} className="ml-2 inline text-koi-gold" />
                )}
              </h1>
              <p className="text-sm text-koi-muted">
                <MapPin size={12} className="inline" /> {seller.location}, {seller.province}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {seller.topSeller && <span className="chip-gold">Top Seller</span>}
                {seller.championBreeder && <span className="chip-gold">Champion Breeder</span>}
                {seller.verified && <span className="chip">Verified Farm</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-koi-muted">Rating</p>
            <p className="font-display text-3xl text-koi-gold">{seller.rating.toFixed(1)}★</p>
            <p className="text-xs text-koi-muted">{seller.totalSales} penjualan</p>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        {seller.description && (
          <p className="mb-8 max-w-3xl text-koi-platinum/80">{seller.description}</p>
        )}
        <h2 className="heading-display mb-4 text-xl text-white">Listing Aktif</h2>
        {seller.listings.length === 0 ? (
          <p className="text-sm text-koi-muted">Belum ada listing aktif dari farm ini.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {seller.listings.map((koi) => {
              const data: KoiCardData = {
                slug: koi.slug,
                name: koi.name,
                coverImage: koi.coverImage,
                category: koi.category,
                bloodline: koi.bloodline,
                sizeCm: koi.sizeCm,
                price: koi.price,
                mode: koi.mode,
                seller: {
                  farmName: koi.seller.farmName,
                  province: koi.seller.province,
                  verified: koi.seller.verified,
                },
                auction: koi.auction
                  ? { currentBid: koi.auction.currentBid, endTime: koi.auction.endTime }
                  : null,
              };
              return <KoiCard key={koi.id} koi={data} />;
            })}
          </div>
        )}
        <div className="mt-6">
          <Link href="/sellers" className="text-xs text-koi-gold">
            ← Lihat semua farm
          </Link>
        </div>
      </section>
    </div>
  );
}
