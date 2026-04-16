import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/utils";

const schema = z.object({
  farmName: z.string().min(2),
  description: z.string().optional(),
  location: z.string().min(2),
  province: z.string().min(2),
  ktpNumber: z.string().length(16),
});

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const existing = await prisma.seller.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ error: "Sudah terdaftar sebagai seller" }, { status: 409 });
  }
  const base = slugify(parsed.data.farmName);
  let slug = base;
  let i = 1;
  while (await prisma.seller.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  const seller = await prisma.seller.create({
    data: {
      userId: user.id,
      farmName: parsed.data.farmName,
      slug,
      description: parsed.data.description,
      location: parsed.data.location,
      province: parsed.data.province,
      ktpNumber: parsed.data.ktpNumber,
      status: "PENDING",
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "SELLER" },
  });
  return NextResponse.json({ ok: true, sellerId: seller.id });
}
