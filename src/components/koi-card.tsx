import Link from "next/link";
import Image from "next/image";
import { MapPin, Ruler, Gavel, Tag, BadgeCheck } from "lucide-react";
import { CATEGORY_LABEL, formatIDR } from "@/lib/utils";

export type KoiCardData = {
  slug: string;
  name: string;
  coverImage: string;
  category: string;
  bloodline: string | null;
  sizeCm: number;
  price: number;
  mode: "FIXED" | "AUCTION";
  seller: {
    farmName: string;
    province: string;
    verified: boolean;
  };
  auction?: {
    currentBid: number;
    endTime: string | Date;
  } | null;
};

export function KoiCard({ koi }: { koi: KoiCardData }) {
  const isAuction = koi.mode === "AUCTION" && koi.auction;
  const displayPrice = isAuction && koi.auction ? koi.auction.currentBid : koi.price;
  return (
    <Link
      href={isAuction ? `/auctions/${koi.slug}` : `/marketplace/${koi.slug}`}
      className="group card overflow-hidden transition hover:border-koi-gold/50"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={koi.coverImage}
          alt={koi.name}
          fill
          sizes="(max-width:768px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="chip-gold">{CATEGORY_LABEL[koi.category] ?? koi.category}</span>
          {isAuction ? (
            <span className="chip-red">
              <Gavel size={10} /> Lelang
            </span>
          ) : (
            <span className="chip">
              <Tag size={10} /> Fixed
            </span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="font-display text-lg font-semibold leading-tight text-white drop-shadow">
            {koi.name}
          </p>
          <p className="text-xs text-koi-muted">{koi.bloodline ?? "Bloodline —"}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-koi-muted">
            {isAuction ? "Current Bid" : "Harga"}
          </p>
          <p className="font-display text-base font-semibold text-koi-gold">
            {formatIDR(displayPrice)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-koi-muted">
          <span className="flex items-center gap-1">
            <Ruler size={12} /> {koi.sizeCm} cm
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-koi-border px-4 py-2 text-xs text-koi-muted">
        <span className="flex items-center gap-1">
          {koi.seller.verified && <BadgeCheck size={12} className="text-koi-gold" />}
          {koi.seller.farmName}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={12} /> {koi.seller.province}
        </span>
      </div>
    </Link>
  );
}
