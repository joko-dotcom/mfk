import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Ruler, Tag, Fish, ShieldCheck, Crown, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL, formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KoiDetailPage({ params }: { params: { slug: string } }) {
  const koi = await prisma.koi
    .findUnique({
      where: { slug: params.slug },
      include: {
        seller: true,
        media: { orderBy: { order: "asc" } },
        auction: true,
      },
    })
    .catch(() => null);

  if (!koi || koi.status !== "ACTIVE") notFound();

  if (koi.mode === "AUCTION" && koi.auction) {
    // redirect-ish: show link instead
  }

  return (
    <div className="container-page py-10">
      <nav className="mb-6 text-xs text-koi-muted">
        <Link href="/marketplace" className="hover:text-white">
          Marketplace
        </Link>
        <span> / </span>
        <Link
          href={`/marketplace?category=${koi.category}`}
          className="hover:text-white"
        >
          {CATEGORY_LABEL[koi.category]}
        </Link>
        <span> / </span>
        <span className="text-koi-platinum">{koi.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <div className="card relative aspect-[4/5] overflow-hidden">
            <Image
              src={koi.coverImage}
              alt={koi.name}
              fill
              sizes="(max-width:1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          {koi.media.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {koi.media.slice(0, 10).map((m) => (
                <div key={m.id} className="relative aspect-square overflow-hidden rounded-lg border border-koi-border">
                  {m.type === "video" ? (
                    <video src={m.url} className="h-full w-full object-cover" muted loop />
                  ) : (
                    <Image src={m.url} alt="" fill sizes="20vw" className="object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="chip-gold">{CATEGORY_LABEL[koi.category] ?? koi.category}</span>
              {koi.mode === "AUCTION" ? (
                <span className="chip-red">Lelang</span>
              ) : (
                <span className="chip">
                  <Tag size={10} /> Fixed
                </span>
              )}
              {koi.featured && <span className="chip-gold">Featured</span>}
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold text-white md:text-4xl">
              {koi.name}
            </h1>
            <p className="text-sm text-koi-muted">
              {koi.bloodline ?? "Bloodline —"} • Breeder {koi.breederName ?? "—"}
            </p>
          </div>

          <div className="card p-5">
            {koi.mode === "AUCTION" && koi.auction ? (
              <div>
                <p className="text-xs uppercase tracking-widest text-koi-muted">Lelang</p>
                <p className="font-display text-3xl text-koi-gold">
                  {formatIDR(koi.auction.currentBid)}
                </p>
                <p className="text-xs text-koi-muted">
                  Starting {formatIDR(koi.auction.startingBid)}
                </p>
                <Link href={`/auctions/${koi.slug}`} className="btn-gold mt-4 w-full">
                  Buka Halaman Lelang
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-xs uppercase tracking-widest text-koi-muted">Harga</p>
                <p className="font-display text-3xl text-koi-gold">{formatIDR(koi.price)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-gold flex-1" disabled>
                    Beli Sekarang
                  </button>
                  <button className="btn-ghost" disabled>
                    Tawar
                  </button>
                </div>
                <p className="mt-2 text-xs text-koi-muted">
                  Checkout & escrow pembayaran akan aktif setelah integrasi Midtrans / Xendit.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <Ruler className="mx-auto text-koi-gold" size={18} />
              <p className="mt-1 text-xs text-koi-muted">Ukuran</p>
              <p className="font-medium text-white">{koi.sizeCm} cm</p>
            </div>
            <div className="card p-3 text-center">
              <Fish className="mx-auto text-koi-gold" size={18} />
              <p className="mt-1 text-xs text-koi-muted">Umur</p>
              <p className="font-medium text-white">{koi.ageMonths ?? "-"} bln</p>
            </div>
            <div className="card p-3 text-center">
              <Crown className="mx-auto text-koi-gold" size={18} />
              <p className="mt-1 text-xs text-koi-muted">Sex</p>
              <p className="font-medium text-white">{koi.sex ?? "-"}</p>
            </div>
          </div>

          <div className="card p-5">
            <Link href={`/sellers/${koi.seller.slug}`} className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-koi-gold/10 text-koi-gold">
                <Fish size={18} />
              </span>
              <div className="flex-1">
                <p className="font-medium text-white">
                  {koi.seller.farmName}
                  {koi.seller.verified && (
                    <BadgeCheck size={14} className="ml-1 inline text-koi-gold" />
                  )}
                </p>
                <p className="text-xs text-koi-muted">
                  <MapPin size={10} className="inline" /> {koi.seller.location} •{" "}
                  {koi.seller.province}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-koi-muted">Rating</p>
                <p className="font-display text-base text-koi-gold">
                  {koi.seller.rating.toFixed(1)}★
                </p>
              </div>
            </Link>
          </div>

          <div className="card p-5">
            <p className="mb-2 text-xs uppercase tracking-widest text-koi-muted">
              Deskripsi
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-koi-platinum/90">
              {koi.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="card flex items-start gap-3 p-4">
              <ShieldCheck className="text-koi-gold" />
              <div>
                <p className="font-medium text-white">Escrow Aman</p>
                <p className="text-xs text-koi-muted">
                  Dana ditahan hingga ikan diterima & sehat
                </p>
              </div>
            </div>
            <div className="card flex items-start gap-3 p-4">
              <Truck className="text-koi-gold" />
              <div>
                <p className="font-medium text-white">Pengiriman Khusus Koi</p>
                <p className="text-xs text-koi-muted">
                  Packing oksigen + kurir spesialis ikan hidup
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
