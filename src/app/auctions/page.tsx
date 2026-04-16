import Link from "next/link";
import Image from "next/image";
import { Gavel, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Countdown } from "@/components/countdown";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  let auctions: Awaited<ReturnType<typeof prisma.auction.findMany>> = [];
  try {
    auctions = await prisma.auction.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] } },
      include: { koi: { include: { seller: true } } },
      orderBy: { endTime: "asc" },
    });
  } catch {
    auctions = [];
  }

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Realtime</p>
        <h1 className="heading-display text-3xl text-white md:text-4xl">Lelang Koi</h1>
        <p className="mt-1 text-sm text-koi-muted">
          Auto increment, anti-sniper extension, dan bidding realtime.
        </p>
      </div>

      {auctions.length === 0 ? (
        <div className="card p-10 text-center">
          <Gavel className="mx-auto text-koi-gold" />
          <p className="mt-2 text-koi-muted">Belum ada lelang berlangsung.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a) => {
            const koi = (a as unknown as { koi: { slug: string; name: string; coverImage: string; seller: { farmName: string; province: string } } }).koi;
            return (
            <Link
              key={a.id}
              href={`/auctions/${koi.slug}`}
              className="card group overflow-hidden"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={koi.coverImage}
                  alt={koi.name}
                  fill
                  sizes="33vw"
                  className="object-cover transition group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <span className="chip-red">
                    {a.status === "LIVE" ? (
                      <>
                        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-koi-red" />{" "}
                        LIVE
                      </>
                    ) : (
                      <>
                        <Gavel size={10} /> SOON
                      </>
                    )}
                  </span>
                  {a.liveActive && (
                    <span className="chip-gold">
                      <Video size={10} /> Streaming
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1 p-4">
                <p className="font-display text-lg font-semibold text-white">
                  {koi.name}
                </p>
                <p className="text-xs text-koi-muted">
                  {koi.seller.farmName} • {koi.seller.province}
                </p>
                <div className="mt-3 flex items-center justify-between">
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
          );
          })}
        </div>
      )}
    </div>
  );
}
