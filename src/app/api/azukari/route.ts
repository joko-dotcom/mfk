// Azukari (fish boarding): koi owner menitipkan koi ke farm untuk dirawat
// dengan biaya bulanan. Monthly billing MVP-scope dihandle manual; endpoint
// ini hanya menerima dan daftarkan kontrak.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const createSchema = z.object({
  hostSellerId: z.string().min(1),
  koiName: z.string().min(2).max(100),
  sizeCm: z.number().int().positive(),
  bloodline: z.string().max(60).optional(),
  photoUrl: z.string().url().optional(),
  monthlyFeeIDR: z.number().int().positive().optional(),
  endDate: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "mine";

  if (scope === "hosted") {
    if (!user.sellerId) {
      return NextResponse.json({ error: "Hanya seller" }, { status: 403 });
    }
    const items = await prisma.azukariContract.findMany({
      where: { hostSellerId: user.sellerId },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ items });
  }

  const items = await prisma.azukariContract.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      hostSeller: { select: { id: true, farmName: true, slug: true } },
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const d = parsed.data;

  const host = await prisma.seller.findUnique({ where: { id: d.hostSellerId } });
  if (!host || !host.verified) {
    return NextResponse.json({ error: "Host farm tidak ditemukan / belum terverifikasi" }, { status: 400 });
  }

  const setting = await prisma.platformSetting.findFirst();
  const fee = d.monthlyFeeIDR ?? setting?.azukariMonthlyFeeIDR ?? 250_000;

  const item = await prisma.azukariContract.create({
    data: {
      ownerUserId: user.id,
      hostSellerId: d.hostSellerId,
      koiName: d.koiName,
      sizeCm: d.sizeCm,
      bloodline: d.bloodline ?? null,
      photoUrl: d.photoUrl ?? null,
      monthlyFeeIDR: fee,
      endDate: d.endDate ? new Date(d.endDate) : null,
      note: d.note ?? null,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ ok: true, item });
}
