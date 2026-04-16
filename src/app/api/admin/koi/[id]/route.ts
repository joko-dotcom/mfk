import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const schema = z.object({ action: z.enum(["approve", "reject"]) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireRole(["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  const koi = await prisma.koi.findUnique({
    where: { id: params.id },
    include: { auction: true },
  });
  if (!koi) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.action === "approve") {
    await prisma.koi.update({
      where: { id: koi.id },
      data: { status: "ACTIVE" },
    });
    if (koi.auction && koi.auction.status === "SCHEDULED") {
      await prisma.auction.update({
        where: { id: koi.auction.id },
        data: { status: "LIVE" },
      });
    }
  } else {
    await prisma.koi.update({
      where: { id: koi.id },
      data: { status: "CANCELLED" },
    });
  }
  return NextResponse.json({ ok: true });
}
