// Admin user management: ban / unban, membership override.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  action: z.enum(["BAN", "UNBAN", "RESET_STRIKES", "SET_TIER"]),
  reason: z
    .enum(["BID_AND_RUN", "FRAUD", "ABUSE", "MANUAL"])
    .optional(),
  note: z.string().max(500).optional(),
  tier: z.enum(["NONE", "SILVER", "GOLD", "PLATINUM"]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const { action, reason, note, tier } = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Tidak bisa memodifikasi admin lain" }, { status: 400 });
  }

  if (action === "BAN") {
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        isBlacklisted: true,
        blacklistReason: reason ?? "MANUAL",
        blacklistNote: note ?? null,
      },
    });
    await prisma.blacklistStrike.create({
      data: {
        userId: target.id,
        reason: reason ?? "MANUAL",
        note: note ?? "Banned by admin",
      },
    });
    return NextResponse.json({ ok: true, user: updated });
  }

  if (action === "UNBAN") {
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        isBlacklisted: false,
        blacklistReason: null,
        blacklistNote: null,
      },
    });
    return NextResponse.json({ ok: true, user: updated });
  }

  if (action === "RESET_STRIKES") {
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { bidAndRunCount: 0 },
    });
    return NextResponse.json({ ok: true, user: updated });
  }

  if (action === "SET_TIER") {
    if (!tier) {
      return NextResponse.json({ error: "tier wajib diisi" }, { status: 400 });
    }
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        membershipTier: tier,
        membershipUntil: tier === "NONE" ? null : new Date(Date.now() + 30 * 86_400_000),
      },
    });
    return NextResponse.json({ ok: true, user: updated });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
}
