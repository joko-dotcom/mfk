import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Fish, Ruler, Video, Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL, TIER_LABEL } from "@/lib/utils";
import { AuctionLiveRoom } from "@/components/auction-live-room";

export const dynamic = "force-dynamic";

export default async function AuctionDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const koi = await prisma.koi
    .findUnique({
      where: { slug: params.slug },
      include: {
        seller: true,
        media: { orderBy: { order: "asc" } },
        auction: {
          include: {
            bids: {
              orderBy: { createdAt: "desc" },
              take: 20,
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })
    .catch(() => null);

  if (!koi || !koi.auction) notFound();

  const initialBids = koi.auction.bids.map((b) => ({
    id: b.id,
    amount: b.amount,
    userName: b.user.name,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <div className="container-page py-8">
      <nav className="mb-6 text-xs text-koi-muted">
        <Link href="/auctions" className="hover:text-white">
          Lelang
        </Link>
        <span> / </span>
        <span className="text-koi-platinum">{koi.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="card relative aspect-video overflow-hidden">
            {koi.auction.liveActive && koi.auction.liveStreamUrl ? (
              <video
                src={koi.auction.liveStreamUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
                controls
              />
            ) : (
              <>
                <Image
                  src={koi.coverImage}
                  alt={koi.name}
                  fill
                  sizes="(max-width:1024px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2">
                  <span className="chip-red">
                    <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-koi-red" />
                    {koi.auction.status}
                  </span>
                  {koi.auction.memberOnly && (
                    <span className="chip-gold">
                      <Crown size={10} /> Members {TIER_LABEL[koi.auction.minTier]}+
                    </span>
                  )}
                </div>
                <div className="absolute bottom-4 right-4 rounded-xl bg-black/70 px-3 py-2 backdrop-blur">
                  <p className="text-[10px] uppercase text-koi-muted">Live Stream</p>
                  <p className="text-sm text-white">
                    <Video size={12} className="inline" /> Menunggu host start
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {koi.media.slice(0, 10).map((m) => (
              <div
                key={m.id}
                className="relative aspect-square overflow-hidden rounded-lg border border-koi-border"
              >
                {m.type === "video" ? (
                  <video src={m.url} className="h-full w-full object-cover" muted loop />
                ) : (
                  <Image src={m.url} alt="" fill sizes="20vw" className="object-cover" />
                )}
              </div>
            ))}
          </div>

          <div className="card p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="chip-gold">{CATEGORY_LABEL[koi.category]}</span>
              {koi.featured && <span className="chip-gold">Featured</span>}
            </div>
            <h1 className="font-display text-2xl font-semibold text-white md:text-3xl">
              {koi.name}
            </h1>
            <p className="text-sm text-koi-muted">
              {koi.bloodline ?? "—"} • {koi.breederName ?? "—"}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-koi-muted">Size</p>
                <p className="font-medium text-white">
                  <Ruler size={12} className="inline" /> {koi.sizeCm} cm
                </p>
              </div>
              <div>
                <p className="text-xs text-koi-muted">Umur</p>
                <p className="font-medium text-white">{koi.ageMonths ?? "-"} bln</p>
              </div>
              <div>
                <p className="text-xs text-koi-muted">Sex</p>
                <p className="font-medium text-white">{koi.sex ?? "-"}</p>
              </div>
            </div>
            <div className="divider my-4" />
            <p className="whitespace-pre-line text-sm leading-relaxed text-koi-platinum/90">
              {koi.description}
            </p>
          </div>

          <Link href={`/sellers/${koi.seller.slug}`} className="card block p-5">
            <div className="flex items-center gap-3">
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
            </div>
          </Link>
        </div>

        <AuctionLiveRoom
          auctionId={koi.auction.id}
          slug={koi.slug}
          initialCurrentBid={koi.auction.currentBid}
          startingBid={koi.auction.startingBid}
          minIncrement={koi.auction.minIncrement}
          endTime={koi.auction.endTime.toISOString()}
          status={koi.auction.status}
          memberOnly={koi.auction.memberOnly}
          minTier={koi.auction.minTier}
          antiSniperMinutes={koi.auction.antiSniperMinutes}
          initialBids={initialBids}
        />
      </div>
    </div>
  );
}
