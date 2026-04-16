// Minimal Midtrans Snap client. We don't pull the SDK because all we need is:
//   1. POST /snap/v1/transactions   — mint a Snap token for deposit
//   2. Verify signature on notification callback
//
// Docs:
//   https://docs.midtrans.com/reference/getting-started-snap-api
//   https://docs.midtrans.com/reference/signature-key
import crypto from "node:crypto";

export type MidtransConfig = {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
};

export function getMidtransConfig(): MidtransConfig | null {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  if (!serverKey || !clientKey) return null;
  return {
    serverKey,
    clientKey,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  };
}

function apiBase(cfg: MidtransConfig): string {
  return cfg.isProduction
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

function snapBase(cfg: MidtransConfig): string {
  return cfg.isProduction
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

export function clientSnapBase(cfg: MidtransConfig): string {
  return cfg.isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

// Exported for use by wallet/deposit build-time helpers (e.g., embedding the
// snap.js script tag in the app if we ever switch to Snap.js inline mode).
export function assertApiBase(cfg: MidtransConfig): string {
  return apiBase(cfg);
}

export type SnapTransactionInput = {
  orderId: string;
  grossAmount: number;
  customer: { name: string; email: string; phone?: string };
  itemName?: string;
  finishRedirectUrl?: string;
};

export type SnapTransactionResult = {
  token: string;
  redirect_url: string;
};

/**
 * Create a Snap transaction and return { token, redirect_url }. The client
 * can either embed snap.js and call window.snap.pay(token), or redirect the
 * user to redirect_url directly (safer for mobile, no popups).
 */
export async function createSnapTransaction(
  cfg: MidtransConfig,
  input: SnapTransactionInput,
): Promise<SnapTransactionResult> {
  const authHeader =
    "Basic " + Buffer.from(`${cfg.serverKey}:`).toString("base64");
  const body = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: input.grossAmount,
    },
    customer_details: {
      first_name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
    },
    item_details: [
      {
        id: "deposit",
        price: input.grossAmount,
        quantity: 1,
        name: input.itemName ?? "KXA Wallet Top-up",
      },
    ],
    callbacks: input.finishRedirectUrl
      ? { finish: input.finishRedirectUrl }
      : undefined,
  };
  const res = await fetch(`${snapBase(cfg)}/transactions`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: authHeader,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Midtrans ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as SnapTransactionResult;
}

/**
 * Verify the signature sent with a Midtrans notification. The formula is
 * SHA512(orderId + statusCode + grossAmount + serverKey). If this doesn't
 * match, the notification is forged.
 */
export function verifyNotificationSignature(
  cfg: MidtransConfig,
  payload: {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
  },
): boolean {
  const expected = crypto
    .createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${cfg.serverKey}`,
    )
    .digest("hex");
  // Constant-time compare so an attacker can't probe the signature byte-by-byte
  // via wall-clock timing differences.
  if (expected.length !== payload.signature_key.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(payload.signature_key, "utf8"),
  );
}

/**
 * Maps Midtrans transaction_status + fraud_status into the high-level bucket
 * the app cares about.
 */
export function resolveOutcome(
  transactionStatus: string,
  fraudStatus: string | undefined,
): "SETTLED" | "PENDING" | "FAILED" {
  if (transactionStatus === "capture") {
    if (fraudStatus === "accept") return "SETTLED";
    if (fraudStatus === "deny") return "FAILED";
    return "PENDING"; // "challenge" and any other values
  }
  if (transactionStatus === "settlement") return "SETTLED";
  if (transactionStatus === "pending") return "PENDING";
  if (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "expire" ||
    transactionStatus === "failure"
  ) {
    return "FAILED";
  }
  return "PENDING";
}
