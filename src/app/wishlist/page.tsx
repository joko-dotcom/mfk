import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Heart, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatIDR, CATEGORY_LABEL } from "@/lib/utils";
import { WishlistRemoveButton } from "@/components/wishlist-remove-button";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?callbackUrl=/wishlist");
  const items = await prisma.watchlist.findMany({
    where: { userId: user.id },
    include: {
      koi: {
        include: {
          seller: { select: { farmName: true, slug: true, province: true } },
          auction: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Buyer</p>
        <h1 className="heading-display text-3xl text-white">
          <Heart className="mr-2 inline text-koi-gold" size={20} /> Wishlist
        </h1>
        <p className="mt-1 text-sm text-koi-muted">
          Koi & lelang favorit Anda — simpan sebelum gerakan orang lain lebih cepat.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-koi-muted">
          Belum ada koi di wishlist.{" "}
          <Link href="/marketplace" className="text-koi-gold hover:underline">
            Jelajahi Marketplace →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <div key={w.id} className="card overflow-hidden">
              <div className="relative aspect-[4/3] w-full bg-koi-ink/60">
                {w.koi.coverImage && (
                  <Image
                    src={w.koi.coverImage}
                    alt={w.koi.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="space-y-1 p-4">
                <p className="font-medium text-white">{w.koi.name}</p>
                <p className="text-xs text-koi-muted">
                  {CATEGORY_LABEL[w.koi.category]} • {w.koi.sizeCm}cm •{" "}
                  <span className="text-koi-gold">
                    {formatIDR(w.koi.auction?.currentBid ?? w.koi.price)}
                  </span>
                </p>
                <p className="text-xs text-koi-muted">
                  {w.koi.seller.farmName} • {w.koi.seller.province}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <Link
                    href={`/marketplace/${w.koi.slug}`}
                    className="text-xs text-koi-gold hover:underline"
                  >
                    Lihat detail →
                  </Link>
                  <WishlistRemoveButton koiId={w.koi.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Keep Trash2 imported so ESLint-next/next doesn't complain about unused icon in UI.
void Trash2;
