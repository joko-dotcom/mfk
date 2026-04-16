import Link from "next/link";
import Image from "next/image";
import { Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  let auctions: Awaited<ReturnType<typeof prisma.auction.findMany>> = [];
  try {
    auctions = await prisma.auction.findMany({
      where: { status: { in: ["LIVE", "SCHEDULED"] } },
      include: { koi: { include: { seller: true } } },
      orderBy: [{ liveActive: "desc" }, { endTime: "asc" }],
    });
  } catch {
    auctions = [];
  }

  const liveNow = auctions.filter((a) => a.liveActive);
  const scheduled = auctions.filter((a) => !a.liveActive);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-koi-muted">Live Auction</p>
        <h1 className="heading-display text-3xl text-white md:text-4xl">
          Streaming Lelang Koi Realtime
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-koi-muted">
          Tonton ikan yang dilelang secara langsung, chat dengan host & bidder lain, dan
          bid instant dari layar live. Powered by WebRTC / HLS (integrasi LiveKit akan
          tersedia di rilis berikutnya — saat ini menggunakan placeholder video).
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-white">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-koi-red" />
          LIVE SEKARANG ({liveNow.length})
        </h2>
        {liveNow.length === 0 ? (
          <div className="card p-6 text-sm text-koi-muted">
            Belum ada auction streaming saat ini.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liveNow.map((a) => (
              <LiveCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-white">Jadwal Mendatang</h2>
        {scheduled.length === 0 ? (
          <div className="card p-6 text-sm text-koi-muted">
            Tidak ada jadwal live upcoming.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scheduled.map((a) => (
              <LiveCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LiveCard({
  a,
}: {
  a: Awaited<ReturnType<typeof prisma.auction.findMany>>[number];
}) {
  const koi = (a as unknown as { koi: { slug: string; name: string; coverImage: string; seller: { farmName: string; province: string } } }).koi;
  return (
    <Link href={`/auctions/${koi.slug}`} className="card overflow-hidden">
      <div className="relative aspect-video">
        <Image src={koi.coverImage} alt={koi.name} fill sizes="33vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <span className="absolute left-3 top-3 chip-red">
          <Video size={10} /> {a.liveActive ? "LIVE" : "SOON"}
        </span>
      </div>
      <div className="p-3">
        <p className="font-display text-base text-white">{koi.name}</p>
        <p className="text-xs text-koi-muted">
          {koi.seller.farmName} • {formatIDR(a.currentBid)}
        </p>
      </div>
    </Link>
  );
}
