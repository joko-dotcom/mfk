import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/utils";
import type { KoiCategory, MembershipTier } from "@prisma/client";

const koiCategories = [
  "GOSANKE_KOHAKU",
  "GOSANKE_SANKE",
  "GOSANKE_SHOWA",
  "NON_GOSANKE",
  "BABY_KOI",
  "JUMBO_KOI",
  "RARE_COLLECTION",
] as const;

const schema = z.object({
  name: z.string().min(2),
  category: z.enum(koiCategories),
  bloodline: z.string().optional(),
  breederName: z.string().optional(),
  sizeCm: z.number().int().min(1).max(200),
  ageMonths: z.number().int().optional(),
  sex: z.string().optional(),
  description: z.string().min(2),
  coverImage: z.string().url(),
  price: z.number().int().min(0).default(0),
  mode: z.enum(["FIXED", "AUCTION"]),
  startingBid: z.number().int().min(0).optional(),
  minIncrement: z.number().int().min(1000).optional(),
  durationHours: z.number().int().min(1).max(720).optional(),
  memberOnly: z.boolean().optional(),
  minTier: z.enum(["NONE", "SILVER", "GOLD", "PLATINUM"]).optional(),
});

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  if (!user.sellerId) {
    return NextResponse.json({ error: "Harus daftar sebagai seller" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const base = slugify(data.name);
  let slug = base;
  let i = 1;
  while (await prisma.koi.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }

  const koi = await prisma.koi.create({
    data: {
      sellerId: user.sellerId,
      name: data.name,
      slug,
      category: data.category as KoiCategory,
      bloodline: data.bloodline,
      breederName: data.breederName,
      sizeCm: data.sizeCm,
      ageMonths: data.ageMonths,
      sex: data.sex,
      description: data.description,
      coverImage: data.coverImage,
      price: data.mode === "AUCTION" ? data.startingBid ?? 0 : data.price,
      mode: data.mode,
      status: "PENDING_APPROVAL",
    },
  });

  if (data.mode === "AUCTION") {
    const durationHours = data.durationHours ?? 48;
    const startingBid = data.startingBid ?? 1_000_000;
    const now = new Date();
    await prisma.auction.create({
      data: {
        koiId: koi.id,
        startingBid,
        currentBid: startingBid,
        minIncrement: data.minIncrement ?? 100_000,
        startTime: now,
        endTime: new Date(now.getTime() + durationHours * 3600_000),
        status: "SCHEDULED",
        memberOnly: data.memberOnly ?? false,
        minTier: (data.minTier ?? "NONE") as MembershipTier,
      },
    });
  }

  return NextResponse.json({ ok: true, koiId: koi.id, slug: koi.slug });
}
