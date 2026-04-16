// Withdrawal request endpoint. Debits availableBalance immediately so the user
// cannot race-condition re-use the money. Admin then transfers IRL and marks
// the request PAID; if rejected, funds are auto-refunded.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { debitAvailable } from "@/lib/wallet";

const schema = z.object({
  amount: z.number().int().positive(),
  bankName: z.string().min(2).max(50),
  bankAccount: z.string().min(4).max(30),
  accountName: z.string().min(2).max(80),
  note: z.string().max(500).optional(),
});

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const items = await prisma.withdrawalRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const { amount, bankName, bankAccount, accountName, note } = parsed.data;

  const setting = await prisma.platformSetting.findFirst();
  const minWd = setting?.withdrawalMinIDR ?? 50_000;
  const feeAmount = setting?.withdrawalFeeIDR ?? 5_000;
  if (amount < minWd) {
    return NextResponse.json({ error: `Minimal penarikan ${minWd.toLocaleString("id-ID")}` }, { status: 400 });
  }
  const netAmount = Math.max(0, amount - feeAmount);

  try {
    const wr = await prisma.$transaction(async (tx) => {
      const request = await tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          amount,
          feeAmount,
          netAmount,
          bankName,
          bankAccount,
          accountName,
          note: note ?? null,
          status: "PENDING",
        },
      });
      await debitAvailable(tx, {
        userId: user.id,
        amount,
        type: "WITHDRAW",
        reference: request.id,
        note: `Withdraw ${bankName} ${bankAccount}`,
      });
      return request;
    });
    return NextResponse.json({ ok: true, withdrawal: wr });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memproses penarikan";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
