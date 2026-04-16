// Admin actions on withdrawal requests: APPROVE (keep PENDING → APPROVED),
// PAID (mark as transferred), REJECT (refund the debited amount).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { creditAvailable } from "@/lib/wallet";

const schema = z.object({
  action: z.enum(["APPROVE", "PAID", "REJECT"]),
  paymentRef: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
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
  const { action, paymentRef, note } = parsed.data;

  const wr = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } });
  if (!wr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "APPROVE") {
    if (wr.status !== "PENDING") {
      return NextResponse.json({ error: "Withdrawal tidak pending" }, { status: 400 });
    }
    const updated = await prisma.withdrawalRequest.update({
      where: { id: wr.id },
      data: {
        status: "APPROVED",
        note: note ?? wr.note,
        processedBy: user.id,
      },
    });
    return NextResponse.json({ ok: true, withdrawal: updated });
  }

  if (action === "PAID") {
    if (!["PENDING", "APPROVED"].includes(wr.status)) {
      return NextResponse.json({ error: "Withdrawal tidak bisa di-mark paid" }, { status: 400 });
    }
    const updated = await prisma.withdrawalRequest.update({
      where: { id: wr.id },
      data: {
        status: "PAID",
        processedAt: new Date(),
        processedBy: user.id,
        paymentRef: paymentRef ?? wr.paymentRef,
        note: note ?? wr.note,
      },
    });
    return NextResponse.json({ ok: true, withdrawal: updated });
  }

  // REJECT → refund
  if (!["PENDING", "APPROVED"].includes(wr.status)) {
    return NextResponse.json({ error: "Withdrawal tidak bisa direject" }, { status: 400 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const w = await tx.withdrawalRequest.update({
      where: { id: wr.id },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
        processedBy: user.id,
        note: note ?? wr.note,
      },
    });
    // Refund the full amount (original debit included fee)
    await creditAvailable(tx, {
      userId: wr.userId,
      amount: wr.amount,
      type: "REFUND",
      reference: wr.id,
      note: `Refund withdrawal rejected by admin`,
    });
    return w;
  });
  return NextResponse.json({ ok: true, withdrawal: updated });
}
