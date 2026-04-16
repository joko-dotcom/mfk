// KC (Konsinyasi / Consignment): owner menitipkan koi ke host seller untuk
// dijualkan. Owner creates the request, host seller approves/rejects, when
// sold the host seller keeps `feeBps` of the sale as consignment fee.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const createSchema = z.object({
  hostSellerId: z.string().min(1),
  koiName: z.string().min(2).max(100),
  sizeCm: z.number().int().positive(),
  bloodline: z.string().max(60).optional(),
  description: z.string().max(2000).optional(),
  askingPrice: z.number().int().positive(),
  feeBps: z.number().int().min(0).max(5000).optional(),
  photoUrl: z.string().url().optional(),
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
      return NextResponse.json({ error: "Hanya seller bisa melihat consignment hosted" }, { status: 403 });
    }
    const items = await prisma.consignmentListing.findMany({
      where: { hostSellerId: user.sellerId },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ items });
  }

  const items = await prisma.consignmentListing.findMany({
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
  const data = parsed.data;

  const setting = await prisma.platformSetting.findFirst();
  const defaultFee = setting?.kcFeeBps ?? 1500;

  const host = await prisma.seller.findUnique({ where: { id: data.hostSellerId } });
  if (!host || !host.verified) {
    return NextResponse.json({ error: "Host farm tidak ditemukan / belum terverifikasi" }, { status: 400 });
  }

  const item = await prisma.consignmentListing.create({
    data: {
      ownerUserId: user.id,
      hostSellerId: data.hostSellerId,
      koiName: data.koiName,
      sizeCm: data.sizeCm,
      bloodline: data.bloodline ?? null,
      description: data.description ?? null,
      askingPrice: data.askingPrice,
      feeBps: data.feeBps ?? defaultFee,
      photoUrl: data.photoUrl ?? null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true, item });
}
