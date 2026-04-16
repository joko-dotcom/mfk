import Link from "next/link";
import { Fish } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-koi-border bg-koi-ink/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-gradient text-black">
              <Fish size={16} />
            </span>
            <p className="font-display text-lg font-semibold">
              Mafia<span className="gold-text">Koi</span>
            </p>
          </div>
          <p className="mt-3 max-w-xs text-sm text-koi-muted">
            Platform marketplace elit Nishikigoi. Menghubungkan farm koi terbaik di
            Indonesia dengan hobbyist & kolektor.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-koi-muted">Jelajahi</p>
          <ul className="mt-3 space-y-2 text-sm text-koi-platinum">
            <li><Link href="/marketplace">Marketplace</Link></li>
            <li><Link href="/auctions">Lelang</Link></li>
            <li><Link href="/live">Live Auction</Link></li>
            <li><Link href="/community">Komunitas</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-koi-muted">Mafia Koi</p>
          <ul className="mt-3 space-y-2 text-sm text-koi-platinum">
            <li><Link href="/membership">Membership Elit</Link></li>
            <li><Link href="/sellers">Farm Partner</Link></li>
            <li><Link href="/seller/onboarding">Daftar jadi Seller</Link></li>
            <li><Link href="/about">Tentang</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-koi-muted">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-koi-platinum">
            <li><Link href="/legal/terms">Syarat & Ketentuan</Link></li>
            <li><Link href="/legal/privacy">Privasi</Link></li>
            <li><Link href="/legal/escrow">Escrow</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-koi-border">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs text-koi-muted md:flex-row">
          <p>© {new Date().getFullYear()} Mafia Koi Marketplace — All Rights Reserved</p>
          <p>Made with ❤ untuk komunitas Nishikigoi Indonesia</p>
        </div>
      </div>
    </footer>
  );
}
