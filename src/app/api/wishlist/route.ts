import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const addSchema = z.object({ koiId: z.string().min(1) });

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const items = await prisma.watchlist.findMany({
    where: { userId: user.id },
    include: {
      koi: {
        include: {
          seller: { select: { farmName: true, slug: true, province: true } },
          auction: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
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
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  await prisma.watchlist.upsert({
    where: { userId_koiId: { userId: user.id, koiId: parsed.data.koiId } },
    create: { userId: user.id, koiId: parsed.data.koiId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  await prisma.watchlist.deleteMany({
    where: { userId: user.id, koiId: parsed.data.koiId },
  });
  return NextResponse.json({ ok: true });
}
