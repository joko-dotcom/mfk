import Link from "next/link";
import { BadgeCheck, Fish, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SellersPage() {
  let sellers: Awaited<ReturnType<typeof prisma.seller.findMany>> = [];
  try {
    sellers = await prisma.seller.findMany({
      where: { verified: true },
      orderBy: [{ topSeller: "desc" }, { rating: "desc" }],
    });
  } catch {
    sellers = [];
  }

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Farm Partner</p>
        <h1 className="heading-display text-3xl text-white md:text-4xl">
          Direktori Farm Koi Indonesia
        </h1>
      </div>
      {sellers.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-koi-muted">Belum ada farm terverifikasi.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <Link
              key={s.id}
              href={`/sellers/${s.slug}`}
              className="card p-4 transition hover:border-koi-gold/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-koi-gold/10 text-koi-gold">
                    <Fish size={18} />
                  </span>
                  <div>
                    <p className="font-medium text-white">
                      {s.farmName}
                      {s.verified && (
                        <BadgeCheck size={14} className="ml-1 inline text-koi-gold" />
                      )}
                    </p>
                    <p className="text-xs text-koi-muted">
                      <MapPin size={10} className="inline" /> {s.province}
                    </p>
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
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
