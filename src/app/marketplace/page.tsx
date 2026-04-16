import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { KoiCard, type KoiCardData } from "@/components/koi-card";
import { CATEGORY_LABEL } from "@/lib/utils";
import type { KoiCategory, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  minSize?: string;
  maxSize?: string;
  bloodline?: string;
  province?: string;
  sort?: "new" | "price_asc" | "price_desc" | "size_desc";
  q?: string;
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = searchParams;
  const where: Prisma.KoiWhereInput = {
    status: "ACTIVE",
  };
  if (sp.category && sp.category in CATEGORY_LABEL) {
    where.category = sp.category as KoiCategory;
  }
  if (sp.bloodline) {
    where.bloodline = { contains: sp.bloodline, mode: "insensitive" };
  }
  if (sp.province) {
    where.seller = { province: { contains: sp.province, mode: "insensitive" } };
  }
  if (sp.q) {
    where.OR = [
      { name: { contains: sp.q, mode: "insensitive" } },
      { bloodline: { contains: sp.q, mode: "insensitive" } },
      { description: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  const price: Prisma.IntFilter = {};
  if (sp.minPrice) price.gte = Number(sp.minPrice);
  if (sp.maxPrice) price.lte = Number(sp.maxPrice);
  if (Object.keys(price).length) where.price = price;
  const size: Prisma.IntFilter = {};
  if (sp.minSize) size.gte = Number(sp.minSize);
  if (sp.maxSize) size.lte = Number(sp.maxSize);
  if (Object.keys(size).length) where.sizeCm = size;

  const orderBy: Prisma.KoiOrderByWithRelationInput =
    sp.sort === "price_asc"
      ? { price: "asc" }
      : sp.sort === "price_desc"
        ? { price: "desc" }
        : sp.sort === "size_desc"
          ? { sizeCm: "desc" }
          : { createdAt: "desc" };

  const listings = await prisma.koi
    .findMany({
      where,
      include: { seller: true, auction: true },
      orderBy,
      take: 48,
    })
    .catch(() => [] as Array<
      Prisma.KoiGetPayload<{ include: { seller: true; auction: true } }>
    >);

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-koi-muted">Marketplace</p>
          <h1 className="heading-display text-3xl text-white md:text-4xl">
            Jelajahi Koleksi Koi
          </h1>
          <p className="mt-1 text-sm text-koi-muted">
            {listings.length} listing aktif dari farm terverifikasi
          </p>
        </div>
        <form className="flex flex-wrap gap-2" action="/marketplace">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Cari nama / bloodline..."
            className="input max-w-xs"
          />
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <button className="btn-gold">Cari</button>
        </form>
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-4">
          <div className="card p-4">
            <p className="mb-3 text-xs uppercase tracking-widest text-koi-muted">
              Kategori
            </p>
            <div className="flex flex-col gap-1.5 text-sm">
              <Link
                href="/marketplace"
                className={`rounded-lg px-3 py-1.5 ${
                  !sp.category ? "bg-koi-gold/10 text-koi-gold" : "text-koi-platinum hover:bg-koi-panel"
                }`}
              >
                Semua Kategori
              </Link>
              {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/marketplace?category=${key}`}
                  className={`rounded-lg px-3 py-1.5 ${
                    sp.category === key
                      ? "bg-koi-gold/10 text-koi-gold"
                      : "text-koi-platinum hover:bg-koi-panel"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <form action="/marketplace" method="get" className="card space-y-3 p-4">
            <p className="text-xs uppercase tracking-widest text-koi-muted">Filter</p>
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            <div>
              <label className="label">Harga (IDR)</label>
              <div className="flex gap-2">
                <input
                  name="minPrice"
                  placeholder="Min"
                  defaultValue={sp.minPrice}
                  className="input"
                />
                <input
                  name="maxPrice"
                  placeholder="Max"
                  defaultValue={sp.maxPrice}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Ukuran (cm)</label>
              <div className="flex gap-2">
                <input
                  name="minSize"
                  placeholder="Min"
                  defaultValue={sp.minSize}
                  className="input"
                />
                <input
                  name="maxSize"
                  placeholder="Max"
                  defaultValue={sp.maxSize}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Bloodline</label>
              <input
                name="bloodline"
                placeholder="Sakai, Dainichi..."
                defaultValue={sp.bloodline}
                className="input"
              />
            </div>
            <div>
              <label className="label">Provinsi Farm</label>
              <input
                name="province"
                placeholder="Blitar, Tulungagung..."
                defaultValue={sp.province}
                className="input"
              />
            </div>
            <div>
              <label className="label">Urutkan</label>
              <select
                name="sort"
                defaultValue={sp.sort ?? "new"}
                className="input"
              >
                <option value="new">Terbaru</option>
                <option value="price_asc">Harga termurah</option>
                <option value="price_desc">Harga tertinggi</option>
                <option value="size_desc">Ukuran terbesar</option>
              </select>
            </div>
            <button className="btn-gold w-full">Terapkan</button>
          </form>
        </aside>

        <section>
          {listings.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-koi-muted">
                Tidak ada koi sesuai filter. Coba reset filter atau seed database.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {listings.map((koi) => {
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
        </section>
      </div>
    </div>
  );
}
