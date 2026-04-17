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
  const auditNote = `midtrans:${transactionStatus}${fraudStatus ? `/${fraudStatus}` : ""}`;

  // All note writes are CAS-guarded on status === "PENDING" so that a late
  // `cancel` / `expire` notification cannot overwrite the note of an already
  // APPROVED/REJECTED deposit and corrupt the forensic audit trail.
  if (outcome === "FAILED") {
    await prisma.depositRequest.updateMany({
      where: { id: deposit.id, status: "PENDING" },
      data: { status: "REJECTED", note: auditNote },
    });
    return NextResponse.json({ ok: true, outcome });
  }

  if (outcome === "SETTLED") {
    // Idempotent atomic CAS to prevent double-credits on concurrent /
    // retried Midtrans webhooks. Under READ COMMITTED, `UPDATE ... WHERE
    // status='PENDING'` re-evaluates the WHERE clause after acquiring the
    // row lock, so the second caller sees 0 rows affected and short-circuits.
    await prisma.$transaction(async (tx) => {
      const claim = await tx.depositRequest.updateMany({
        where: { id: deposit.id, status: "PENDING" },
        data: { status: "APPROVED", approvedAt: new Date(), note: auditNote },
      });
      if (claim.count === 0) return; // already processed by another request
      const updated = await tx.depositRequest.findUniqueOrThrow({
        where: { id: deposit.id },
      });
      // Defense in depth: ensure the gateway-reported amount matches what we
      // stored when we minted the Snap token. If they diverge (admin tool
      // edit, rogue row write, tampered notification that still had a valid
      // signature somehow), do NOT credit — just leave it APPROVED with the
      // audit note for manual reconciliation.
      const reportedAmount = Number.parseInt(grossAmount, 10);
      if (!Number.isFinite(reportedAmount) || reportedAmount !== updated.amount) {
        // eslint-disable-next-line no-console
        console.error("[midtrans] gross_amount mismatch", {
          orderId: updated.id,
          expected: updated.amount,
          got: grossAmount,
        });
        return;
      }
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
    return NextResponse.json({ ok: true, outcome });
  }

  // outcome === "PENDING" — still record the intermediate state in the note
  // (CAS-guarded so we don't stomp on a terminal status).
  await prisma.depositRequest.updateMany({
    where: { id: deposit.id, status: "PENDING" },
    data: { note: auditNote },
  });
  return NextResponse.json({ ok: true, outcome });
}
