"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X, Fish, Gavel, Video, Crown, Users, LayoutDashboard, ShieldCheck, Trophy, Wallet, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/marketplace", label: "Marketplace", icon: Fish },
  { href: "/auctions", label: "Lelang", icon: Gavel },
  { href: "/live", label: "Live", icon: Video },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/membership", label: "Membership", icon: Crown },
  { href: "/community", label: "Komunitas", icon: Users },
];

const LOGGED_NAV = [
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

export function SiteNavbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const isSeller = session?.user?.role === "SELLER";

  return (
    <header className="sticky top-0 z-40 border-b border-koi-border/80 bg-koi-ink/70 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient text-black shadow-gold">
              <Fish size={18} />
            </span>
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold text-white">
                Mafia<span className="gold-text">Koi</span>
              </p>
              <p className="-mt-1 text-[10px] uppercase tracking-[0.22em] text-koi-muted">
                Marketplace
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-full px-3 py-1.5 text-sm text-koi-platinum/80 transition hover:bg-koi-panel hover:text-white"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {session?.user &&
            LOGGED_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-full px-3 py-1.5 text-sm text-koi-platinum/80 transition hover:bg-koi-panel hover:text-white"
              >
                <n.icon size={14} className="mr-1 inline" /> {n.label}
              </Link>
            ))}
          {isAdmin && (
            <Link href="/admin" className="btn-ghost">
              <ShieldCheck size={14} /> Admin
            </Link>
          )}
          {isSeller && (
            <Link href="/seller" className="btn-ghost">
              <LayoutDashboard size={14} /> Seller
            </Link>
          )}
          {session?.user ? (
            <>
              <Link href="/account" className="btn-ghost">
                {session.user.name}
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-ghost">
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost">
                Masuk
              </Link>
              <Link href="/auth/register" className="btn-gold">
                Daftar
              </Link>
            </>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-koi-border p-2 text-white lg:hidden"
          aria-label="Menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <div
        className={cn(
          "lg:hidden border-t border-koi-border bg-koi-ink/95 backdrop-blur-xl",
          open ? "block" : "hidden",
        )}
      >
        <div className="container-page flex flex-col gap-1 py-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-koi-platinum hover:bg-koi-panel"
            >
              <n.icon size={16} /> {n.label}
            </Link>
          ))}
          {session?.user &&
            LOGGED_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-koi-platinum hover:bg-koi-panel"
              >
                <n.icon size={16} /> {n.label}
              </Link>
            ))}
          <div className="divider my-2" />
          {isAdmin && (
            <Link href="/admin" className="btn-ghost w-full justify-start">
              <ShieldCheck size={14} /> Admin Panel
            </Link>
          )}
          {isSeller && (
            <Link href="/seller" className="btn-ghost w-full justify-start">
              <LayoutDashboard size={14} /> Seller Dashboard
            </Link>
          )}
          {session?.user ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="btn-ghost w-full justify-start"
            >
              Keluar ({session.user.name})
            </button>
          ) : (
            <div className="flex gap-2">
              <Link href="/auth/login" className="btn-ghost flex-1">
                Masuk
              </Link>
              <Link href="/auth/register" className="btn-gold flex-1">
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
