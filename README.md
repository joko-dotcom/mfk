# Mafia Koi Marketplace

> Tokopedia-nya Ikan Koi — marketplace multi-vendor premium Nishikigoi, lelang realtime, live auction streaming, membership elit & komunitas koi Indonesia.

## Tech Stack

- **Next.js 14** App Router + TailwindCSS + TypeScript
- **Prisma** + PostgreSQL (Neon / Supabase / Vercel Postgres)
- **NextAuth.js** (JWT + Credentials)
- **Server-Sent Events** untuk realtime bid (in-process pub/sub, siap di-upgrade ke Redis/Pusher/Ably)
- **Zod** untuk validasi input
- **Lucide icons** + Playfair Display + Inter (dark luxury theme)

## Fitur MVP

- Multi-seller (Admin / Seller / Buyer + Member Elite)
- Marketplace koi (kategori Gosanke, Non-Gosanke, Baby, Jumbo, Rare)
- Filter harga, ukuran, bloodline, lokasi
- Seller dashboard (upload koi fixed price / lelang)
- Sistem lelang realtime dengan anti-sniper time extension
- Admin panel (approve seller & listing, fee, analytics)
- Membership tiers (Silver / Gold / Platinum)
- Live auction room (chat + bid realtime SSE)
- Komunitas (showcase & diskusi)

## Setup

```bash
npm install
cp .env.example .env
# isi DATABASE_URL dan NEXTAUTH_SECRET
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@mafiakoi.id` | `admin123` |
| Seller | `sakai@mafiakoi.id` | `seller123` |
| Buyer (Gold) | `kolektor@mafiakoi.id` | `buyer123` |
| Buyer | `hobbyist@mafiakoi.id` | `buyer123` |

## Deploy ke Vercel

1. Push repo ke GitHub.
2. Import di Vercel, set env `DATABASE_URL` (Neon/Supabase) & `NEXTAUTH_SECRET`.
3. Build command: `prisma generate && next build` (sudah di `package.json`).
4. Seed data dari lokal dengan `DATABASE_URL` production: `npm run db:seed`.

## Roadmap (post-MVP)

- Live streaming WebRTC/HLS (LiveKit/Agora)
- Payment gateway (Midtrans/Xendit) + escrow release
- Upload image Cloudinary/UploadThing
- Social automation (TikTok/IG/YouTube)
- AI rekomendasi koi
- Integrasi kurir ikan hidup
- NFT & sertifikat digital koi
