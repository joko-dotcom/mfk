// Host seller actions on a consignment listing: APPROVE → ACTIVE,
// REJECT → CANCELLED, COMPLETE → sold (with soldPrice).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { creditAvailable } from "@/lib/wallet";

const actSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "COMPLETE", "CANCEL"]),
  soldPrice: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = actSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const { action, soldPrice, note } = parsed.data;

  const item = await prisma.consignmentListing.findUnique({ where: { id: params.id } });
  if (!item) {
    return NextResponse.json({ error: "Consignment tidak ditemukan" }, { status: 404 });
  }

  // Host seller actions
  if (["APPROVE", "REJECT", "COMPLETE"].includes(action)) {
    if (!user.sellerId || item.hostSellerId !== user.sellerId) {
      return NextResponse.json({ error: "Hanya host farm yang bisa aksi ini" }, { status: 403 });
    }
  }
  // Owner can cancel only while still PENDING
  if (action === "CANCEL") {
    if (item.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Hanya owner yang bisa membatalkan" }, { status: 403 });
    }
    if (item.status !== "PENDING") {
      return NextResponse.json({ error: "Tidak bisa dibatalkan setelah disetujui" }, { status: 400 });
    }
  }

  if (action === "APPROVE") {
    if (item.status !== "PENDING") {
      return NextResponse.json({ error: "Consignment sudah tidak pending" }, { status: 400 });
    }
    const updated = await prisma.consignmentListing.update({
      where: { id: item.id },
      data: { status: "ACTIVE", note: note ?? item.note },
    });
    return NextResponse.json({ ok: true, item: updated });
  }

  if (action === "REJECT" || action === "CANCEL") {
    const updated = await prisma.consignmentListing.update({
      where: { id: item.id },
      data: { status: "CANCELLED", note: note ?? item.note },
    });
    return NextResponse.json({ ok: true, item: updated });
  }

  if (action === "COMPLETE") {
    if (item.status !== "ACTIVE") {
      return NextResponse.json({ error: "Consignment belum aktif" }, { status: 400 });
    }
    if (!soldPrice) {
      return NextResponse.json({ error: "soldPrice wajib diisi" }, { status: 400 });
    }
    const feeAmount = Math.round((soldPrice * item.feeBps) / 10_000);
    const ownerShare = soldPrice - feeAmount;

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.consignmentListing.update({
        where: { id: item.id },
        data: {
          status: "COMPLETED",
          soldPrice,
          soldAt: new Date(),
          note: note ?? item.note,
        },
      });
      await creditAvailable(tx, {
        userId: item.ownerUserId,
        amount: ownerShare,
        type: "SELLER_PAYOUT",
        reference: item.id,
        note: `Payout konsinyasi ${item.koiName} (sold ${soldPrice}, fee ${feeAmount})`,
      });
      return up;
    });
    return NextResponse.json({ ok: true, item: updated, ownerShare, feeAmount });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
}
