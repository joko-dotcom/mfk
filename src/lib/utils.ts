import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(value: number): string {
  if (!Number.isFinite(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function shortIDR(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const CATEGORY_LABEL: Record<string, string> = {
  GOSANKE_KOHAKU: "Kohaku",
  GOSANKE_SANKE: "Sanke",
  GOSANKE_SHOWA: "Showa",
  NON_GOSANKE: "Non Gosanke",
  BABY_KOI: "Baby Koi",
  JUMBO_KOI: "Jumbo Koi",
  RARE_COLLECTION: "Rare Collection",
};

export const TIER_LABEL: Record<string, string> = {
  NONE: "Reguler",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

export function tierRank(tier: string): number {
  return ["NONE", "SILVER", "GOLD", "PLATINUM"].indexOf(tier);
}

export function msUntil(date: Date | string): number {
  const t = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  return Math.max(0, t - Date.now());
}

export function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
