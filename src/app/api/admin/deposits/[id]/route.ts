// Admin action on a pending deposit request. APPROVE credits the user wallet
// and marks the request APPROVED; REJECT just closes the request.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { creditAvailable, creditSellerDeposit } from "@/lib/wallet";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
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
  const { action, note } = parsed.data;

  const dep = await prisma.depositRequest.findUnique({ where: { id: params.id } });
  if (!dep) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dep.status !== "PENDING") {
    return NextResponse.json({ error: "Deposit sudah diproses" }, { status: 400 });
  }

  if (action === "REJECT") {
    const updated = await prisma.depositRequest.update({
      where: { id: dep.id },
      data: { status: "REJECTED", note: note ?? dep.note, approvedBy: user.id },
    });
    return NextResponse.json({ ok: true, deposit: updated });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.depositRequest.update({
      where: { id: dep.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: user.id,
        note: note ?? dep.note,
      },
    });
    if (dep.purpose === "SELLER") {
      await creditSellerDeposit(tx, {
        userId: dep.userId,
        amount: dep.amount,
        type: "SELLER_DEPOSIT",
        reference: dep.id,
        note: `Admin-approved seller deposit`,
      });
    } else {
      await creditAvailable(tx, {
        userId: dep.userId,
        amount: dep.amount,
        type: "DEPOSIT",
        reference: dep.id,
        note: `Admin-approved top up`,
      });
    }
    return d;
  });
  return NextResponse.json({ ok: true, deposit: updated });
}
