import Link from "next/link";
import Image from "next/image";
import {
  Gavel,
  Video,
  Crown,
  ShieldCheck,
  BadgeCheck,
  Sparkles,
  ArrowRight,
  Fish,
  TrendingUp,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { KoiCard, type KoiCardData } from "@/components/koi-card";
import { Countdown } from "@/components/countdown";
import { formatIDR, CATEGORY_LABEL } from "@/lib/utils";

export const revalidate = 30;

async function getData() {
  try {
    const [featured, liveAuctions, topSellers] = await Promise.all([
      prisma.koi.findMany({
        where: { status: "ACTIVE" },
        include: { seller: true, auction: true },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.auction.findMany({
        where: { status: { in: ["SCHEDULED", "LIVE"] } },
        include: { koi: { include: { seller: true } } },
        orderBy: { endTime: "asc" },
        take: 4,
      }),
      prisma.seller.findMany({
        where: { verified: true },
        orderBy: [{ topSeller: "desc" }, { rating: "desc" }],
        take: 6,
      }),
    ]);
    return { featured, liveAuctions, topSellers };
  } catch {
    return { featured: [], liveAuctions: [], topSellers: [] };
  }
}

export default async function HomePage() {
  const { featured, liveAuctions, topSellers } = await getData();

  const hasData = featured.length > 0 || liveAuctions.length > 0;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-radial" />
        <div className="container-page relative grid gap-12 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <span className="chip-gold w-fit">
              <Sparkles size={12} /> Tokopedia-nya Ikan Koi
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white md:text-6xl">
              Marketplace Elit <span className="gold-text">Nishikigoi</span>
              <br />
              untuk Kolektor Indonesia
            </h1>
            <p className="mt-5 max-w-xl text-koi-platinum/80">
              Multi-seller farm koi pilihan, lelang realtime, live auction
              streaming, escrow aman, dan komunitas elit. Semua ekosistem koi
              terbesar di Indonesia — dalam satu platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/marketplace" className="btn-gold">
                Jelajahi Marketplace <ArrowRight size={14} />
              </Link>
              <Link href="/auctions" className="btn-ghost">
                <Gavel size={14} /> Ikut Lelang
              </Link>
              <Link href="/seller/onboarding" className="btn-ghost">
                Jadi Seller
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-koi-border pt-6 text-sm">
              <div>
                <p className="font-display text-2xl font-semibold text-white">500+</p>
                <p className="text-xs text-koi-muted">Farm terverifikasi</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-white">50rb+</p>
                <p className="text-xs text-koi-muted">Kolektor aktif</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-white">24/7</p>
                <p className="text-xs text-koi-muted">Live auction</p>
              </div>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute inset-0 translate-x-6 translate-y-6 rounded-3xl border border-koi-gold/30" />
            <div className="card relative aspect-[4/5] overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=900&q=80"
                alt="Koi hero"
                fill
                sizes="50vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <span className="chip-red w-fit">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-koi-red" />
                  LIVE AUCTION
                </span>
                <p className="mt-2 font-display text-2xl font-semibold text-white">
                  Grand Champion Showa 72cm
                </p>
                <p className="text-xs text-koi-muted">Sakai Fish Farm • Hiroshima Bloodline</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-koi-border bg-koi-ink/50">
        <div className="container-page grid grid-cols-2 gap-6 py-6 text-sm md:grid-cols-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-koi-gold" size={22} />
            <div>
              <p className="font-medium text-white">Escrow Aman</p>
              <p className="text-xs text-koi-muted">Dana ditahan hingga ikan diterima</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BadgeCheck className="text-koi-gold" size={22} />
            <div>
              <p className="font-medium text-white">Farm Terverifikasi</p>
              <p className="text-xs text-koi-muted">KTP & farm diverifikasi admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Video className="text-koi-gold" size={22} />
            <div>
              <p className="font-medium text-white">Live Auction</p>
              <p className="text-xs text-koi-muted">Nonton, chat, bid langsung</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Crown className="text-koi-gold" size={22} />
            <div>
              <p className="font-medium text-white">Elite Membership</p>
              <p className="text-xs text-koi-muted">Akses lelang eksklusif premium</p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-koi-muted">Eksplor</p>
            <h2 className="heading-display text-2xl text-white md:text-3xl">Kategori Koi</h2>
          </div>
          <Link href="/marketplace" className="text-sm text-koi-gold hover:underline">
            Lihat semua →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {Object.keys(CATEGORY_LABEL).map((key) => (
            <Link
              key={key}
              href={`/marketplace?category=${key}`}
              className="card flex flex-col items-center justify-center px-4 py-6 text-center transition hover:border-koi-gold/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-koi-gold/10 text-koi-gold">
                <Fish size={18} />
              </span>
              <p className="mt-3 font-medium text-white">{CATEGORY_LABEL[key]}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* LIVE AUCTION */}
      {liveAuctions.length > 0 && (
        <section className="container-page pb-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-koi-muted">Hot Now</p>
              <h2 className="heading-display text-2xl text-white md:text-3xl">
                Lelang Berjalan
              </h2>
            </div>
            <Link href="/auctions" className="text-sm text-koi-gold hover:underline">
              Lihat semua →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {liveAuctions.map((a) => (
              <Link
                key={a.id}
                href={`/auctions/${a.koi.slug}`}
                className="card group overflow-hidden"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={a.koi.coverImage}
                    alt={a.koi.name}
                    fill
                    sizes="25vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute left-3 top-3 chip-red">
                    <Gavel size={10} /> {a.status === "LIVE" ? "LIVE" : "SOON"}
                  </span>
                </div>
                <div className="space-y-1 p-4">
                  <p className="font-display text-lg font-semibold text-white">
                    {a.koi.name}
                  </p>
                  <p className="text-xs text-koi-muted">{a.koi.seller.farmName}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-koi-muted">Current Bid</p>
                      <p className="font-display text-base text-koi-gold">
                        {formatIDR(a.currentBid)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-koi-muted">Berakhir</p>
                      <Countdown endTime={a.endTime} className="font-mono text-sm text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FEATURED LISTINGS */}
      {featured.length > 0 && (
        <section className="container-page pb-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-koi-muted">Featured</p>
              <h2 className="heading-display text-2xl text-white md:text-3xl">
                Koi Pilihan
              </h2>
            </div>
            <Link href="/marketplace" className="text-sm text-koi-gold hover:underline">
              Lihat semua →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.slice(0, 8).map((koi) => {
              const card: KoiCardData = {
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
              return <KoiCard key={koi.id} koi={card} />;
            })}
          </div>
        </section>
      )}

      {/* TOP SELLERS */}
      {topSellers.length > 0 && (
        <section className="container-page pb-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-koi-muted">Partner</p>
              <h2 className="heading-display text-2xl text-white md:text-3xl">
                Top Farm Seluruh Indonesia
              </h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {topSellers.map((s) => (
              <Link key={s.id} href={`/sellers/${s.slug}`} className="card p-4 transition hover:border-koi-gold/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-koi-gold/10 text-koi-gold">
                      <Fish size={20} />
                    </span>
                    <div>
                      <p className="font-medium text-white">
                        {s.farmName}
                        {s.verified && (
                          <BadgeCheck size={14} className="ml-1 inline text-koi-gold" />
                        )}
                      </p>
                      <p className="text-xs text-koi-muted">{s.province}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-koi-muted">Rating</p>
                    <p className="font-display text-base text-koi-gold">{s.rating.toFixed(1)}★</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.topSeller && <span className="chip-gold">Top Seller</span>}
                  {s.championBreeder && <span className="chip-gold">Champion Breeder</span>}
                  {s.verified && <span className="chip">Verified Farm</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* MEMBERSHIP CTA */}
      <section className="container-page pb-20">
        <div className="card relative overflow-hidden p-8 md:p-12">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-koi-gold/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-koi-red/10 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-2">
            <div>
              <span className="chip-gold">
                <Crown size={12} /> Elite Membership
              </span>
              <h3 className="mt-4 font-display text-3xl font-semibold text-white">
                Bergabung dengan <span className="gold-text">Koi Elite Circle</span>
              </h3>
              <p className="mt-3 max-w-lg text-sm text-koi-platinum/80">
                Akses lelang eksklusif, early access koi premium, diskon fee lelang,
                konten edukasi, dan grup WhatsApp khusus kolektor.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link href="/membership" className="btn-gold">
                Lihat Benefit
              </Link>
              <Link href="/community" className="btn-ghost">
                <Users size={14} /> Komunitas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {!hasData && (
        <section className="container-page pb-20">
          <div className="card p-8 text-center">
            <TrendingUp className="mx-auto text-koi-gold" />
            <p className="mt-2 text-sm text-koi-muted">
              Belum ada data listing. Jalankan <code className="text-koi-gold">npm run db:seed</code>{" "}
              atau daftar sebagai seller & upload koi pertama Anda.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
