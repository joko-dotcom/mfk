// Midtrans notification webhook. Midtrans POSTs here every time a payment
// transitions state. We verify the signature, look up the matching deposit,
// and on "SETTLED" we credit the wallet (available or seller-deposit) in a
// single Prisma transaction.
//
// Midtrans will retry up to ~30 times with exponential backoff, so this
// endpoint must be idempotent — we guard by only crediting if the deposit is
// still PENDING.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMidtransConfig,
  resolveOutcome,
  verifyNotificationSignature,
} from "@/lib/midtrans";
import { creditAvailable, creditSellerDeposit } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cfg = getMidtransConfig();
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "Midtrans belum dikonfigurasi" },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => null)) as
    | Record<string, string>
    | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const orderId = body.order_id;
  const statusCode = body.status_code;
  const grossAmount = body.gross_amount;
  const signatureKey = body.signature_key;
  const transactionStatus = body.transaction_status;
  const fraudStatus = body.fraud_status;
  if (!orderId || !statusCode || !grossAmount || !signatureKey || !transactionStatus) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  const ok = verifyNotificationSignature(cfg, {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
  });
  if (!ok) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  const deposit = await prisma.depositRequest.findUnique({
    where: { id: orderId },
  });
  if (!deposit) {
    // Log but return 200 so Midtrans stops retrying. Could be a test ping.
    // eslint-disable-next-line no-console
    console.warn("[midtrans] unknown order_id", orderId);
    return NextResponse.json({ ok: true, skipped: true });
  }

  const outcome = resolveOutcome(transactionStatus, fraudStatus);

  // Always keep an audit trail of the raw callback for forensic purposes.
  await prisma.depositRequest.update({
    where: { id: deposit.id },
    data: {
      note: `midtrans:${transactionStatus}${fraudStatus ? `/${fraudStatus}` : ""}`,
    },
  });

  if (outcome === "FAILED" && deposit.status === "PENDING") {
    await prisma.depositRequest.update({
      where: { id: deposit.id },
      data: {
        status: "REJECTED",
        note: `midtrans:${transactionStatus}${fraudStatus ? `/${fraudStatus}` : ""}`,
      },
    });
    return NextResponse.json({ ok: true, outcome });
  }

  if (outcome === "SETTLED" && deposit.status === "PENDING") {
    // Idempotent atomic CAS to prevent double-credits on concurrent /
    // retried Midtrans webhooks. Under READ COMMITTED, `UPDATE ... WHERE
    // status='PENDING'` re-evaluates the WHERE clause after acquiring the
    // row lock, so the second caller sees 0 rows affected and short-circuits.
    await prisma.$transaction(async (tx) => {
      const claim = await tx.depositRequest.updateMany({
        where: { id: deposit.id, status: "PENDING" },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
      if (claim.count === 0) return; // already processed by another request
      const updated = await tx.depositRequest.findUniqueOrThrow({
        where: { id: deposit.id },
      });
      if (updated.purpose === "SELLER") {
        await creditSellerDeposit(tx, {
          userId: updated.userId,
          amount: updated.amount,
          type: "SELLER_DEPOSIT",
          reference: updated.id,
          note: "Midtrans seller deposit",
        });
      } else {
        await creditAvailable(tx, {
          userId: updated.userId,
          amount: updated.amount,
          type: "DEPOSIT",
          reference: updated.id,
          note: "Midtrans top-up",
        });
      }
    });
  }

  return NextResponse.json({ ok: true, outcome });
}
