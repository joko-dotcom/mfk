import Link from "next/link";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/utils";

export const revalidate = 300;

const TIERS = [
  {
    key: "SILVER" as const,
    name: "Silver",
    color: "from-slate-400 to-slate-600",
    defaultPrice: 99_000,
    features: [
      "Akses 10 lelang eksklusif / bulan",
      "Early access 6 jam",
      "Diskon fee lelang 10%",
      "Konten edukasi dasar",
    ],
  },
  {
    key: "GOLD" as const,
    name: "Gold",
    color: "from-koi-goldDark to-koi-gold",
    defaultPrice: 299_000,
    features: [
      "Semua benefit Silver",
      "Akses lelang Gold-only",
      "Early access 24 jam",
      "Diskon fee lelang 25%",
      "Grup WhatsApp Gold Club",
      "Webinar bulanan bersama breeder",
    ],
    popular: true,
  },
  {
    key: "PLATINUM" as const,
    name: "Platinum",
    color: "from-koi-platinum to-white",
    defaultPrice: 999_000,
    features: [
      "Semua benefit Gold",
      "Akses lelang Platinum-only",
      "Priority buy koi Grand Champion",
      "Fee lelang 0%",
      "Konsultasi 1-on-1 master breeder",
      "Concierge kurir ikan nasional",
    ],
  },
];

export default async function MembershipPage() {
  const setting = await prisma.platformSetting
    .findFirst()
    .catch(() => null);

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip-gold">
          <Crown size={12} /> Elite Membership
        </span>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white md:text-5xl">
          <span className="gold-text">Koi Elite Circle</span>
        </h1>
        <p className="mt-3 text-koi-platinum/80">
          Masuki komunitas elit kolektor Nishikigoi. Akses lelang eksklusif, early access
          koi premium, diskon fee, grup WA khusus & konten edukasi dari master breeder.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {TIERS.map((t) => {
          const price =
            t.key === "SILVER"
              ? setting?.silverPriceIDR ?? t.defaultPrice
              : t.key === "GOLD"
                ? setting?.goldPriceIDR ?? t.defaultPrice
                : setting?.platinumPriceIDR ?? t.defaultPrice;
          return (
            <div
              key={t.key}
              className={`card relative p-6 ${t.popular ? "border-koi-gold" : ""}`}
            >
              {t.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip-gold">
                  <Sparkles size={10} /> Paling Populer
                </span>
              )}
              <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${t.color}`} />
              <p className="font-display text-2xl text-white">{t.name}</p>
              <p className="mt-1 text-sm text-koi-muted">/ bulan</p>
              <p className="mt-3 font-display text-4xl text-koi-gold">
                {formatIDR(price)}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-koi-platinum/90">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 text-koi-gold" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/api/membership/checkout?tier=${t.key}`}
                className={t.popular ? "btn-gold mt-6 w-full" : "btn-ghost mt-6 w-full"}
              >
                <Zap size={14} /> Aktifkan
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-14 card p-6 text-sm text-koi-muted">
        <p className="font-medium text-white">Catatan MVP</p>
        <p className="mt-1">
          Pembayaran membership (Midtrans / Xendit) belum aktif. Untuk demo, admin dapat
          mengubah tier member langsung via database. Checkout akan diaktifkan pada rilis
          berikutnya bersamaan dengan payment gateway.
        </p>
      </div>
    </div>
  );
}
