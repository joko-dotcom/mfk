// Deposit request endpoint. In MOCK mode (default in MVP) the request is
// auto-approved — wallet gets credited immediately so buyers/sellers can
// exercise the bidding flow end-to-end without wiring Midtrans/Xendit yet.
// Flip `PLATFORM_DEPOSIT_AUTO_APPROVE=false` or set a non-MOCK payment method
// to route requests through admin approval instead.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { creditAvailable, creditSellerDeposit } from "@/lib/wallet";
import { getMidtransConfig, createSnapTransaction } from "@/lib/midtrans";
import type { PaymentMethod } from "@prisma/client";

const schema = z.object({
  amount: z.number().int().positive(),
  method: z.enum(["MOCK", "MIDTRANS", "XENDIT", "MANUAL_BANK_TRANSFER"]).default("MOCK"),
  purpose: z.enum(["BUYER", "SELLER"]).default("BUYER"),
  note: z.string().max(500).optional(),
});

const AUTO_APPROVE = process.env.PLATFORM_DEPOSIT_AUTO_APPROVE !== "false";
// Allow MOCK deposits even when Midtrans is configured. Opt-in so staging/prod
// environments with real gateway credentials can't accidentally let users
// self-credit via `{method: "MOCK"}`.
const ALLOW_MOCK_WITH_GATEWAY =
  process.env.PLATFORM_ALLOW_MOCK_DEPOSIT === "true";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const items = await prisma.depositRequest.findMany({
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
  const { amount, method, purpose, note } = parsed.data;

  // Block MOCK self-credit when a real gateway is configured. MOCK is a dev
  // convenience; once MIDTRANS_SERVER_KEY etc. are set, any authenticated
  // user could otherwise POST `{method: "MOCK"}` and credit themselves.
  if (
    method === "MOCK" &&
    !ALLOW_MOCK_WITH_GATEWAY &&
    getMidtransConfig() !== null
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "MOCK deposit dinonaktifkan karena payment gateway aktif. Set PLATFORM_ALLOW_MOCK_DEPOSIT=true hanya untuk development.",
      },
      { status: 400 },
    );
  }

  const setting = await prisma.platformSetting.findFirst();
  const min =
    purpose === "SELLER"
      ? (setting?.minSellerDepositIDR ?? 1_000_000)
      : (setting?.minBuyerDepositIDR ?? 500_000);
  if (amount < min) {
    return NextResponse.json(
      { error: `Minimal deposit ${purpose === "SELLER" ? "seller" : "buyer"} adalah ${min.toLocaleString("id-ID")}` },
      { status: 400 },
    );
  }

  const autoApprove = AUTO_APPROVE && method === "MOCK";

  // Validate Midtrans config BEFORE creating the deposit row so we don't
  // leak orphaned PENDING rows when the gateway isn't wired up.
  const midtransCfg = method === "MIDTRANS" ? getMidtransConfig() : null;
  if (method === "MIDTRANS" && !midtransCfg) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Midtrans belum dikonfigurasi di server (MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY)",
      },
      { status: 503 },
    );
  }

  const deposit = await prisma.$transaction(async (tx) => {
    const dep = await tx.depositRequest.create({
      data: {
        userId: user.id,
        amount,
        method: method as PaymentMethod,
        status: autoApprove ? "APPROVED" : "PENDING",
        approvedAt: autoApprove ? new Date() : null,
        purpose,
        note: note ?? null,
      },
    });
    if (autoApprove) {
      if (purpose === "SELLER") {
        await creditSellerDeposit(tx, {
          userId: user.id,
          amount,
          type: "SELLER_DEPOSIT",
          reference: dep.id,
          note: "Mock seller deposit (auto-approved)",
        });
      } else {
        await creditAvailable(tx, {
          userId: user.id,
          amount,
          type: "DEPOSIT",
          reference: dep.id,
          note: "Mock top-up (auto-approved)",
        });
      }
    }
    return dep;
  });

  // For MIDTRANS we mint a Snap transaction right after creating the deposit.
  // The deposit stays PENDING until the `/api/midtrans/webhook` notification
  // confirms settlement, which then credits the wallet.
  if (method === "MIDTRANS" && midtransCfg) {
    try {
      const appUrl =
        process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
      const snap = await createSnapTransaction(midtransCfg, {
        orderId: deposit.id,
        grossAmount: amount,
        customer: {
          name: user.name ?? user.email ?? "KXA User",
          email: user.email ?? "",
        },
        itemName:
          purpose === "SELLER" ? "KXA Seller Deposit" : "KXA Wallet Top-up",
        finishRedirectUrl: `${appUrl.replace(/\/$/, "")}/wallet?deposit=${deposit.id}`,
      });
      return NextResponse.json({
        ok: true,
        deposit,
        snap: { token: snap.token, redirectUrl: snap.redirect_url },
      });
    } catch (e) {
      // Snap creation failed *after* the DepositRequest row was committed.
      // Mark it REJECTED so it doesn't linger as a ghost PENDING entry that
      // no webhook will ever resolve.
      await prisma.depositRequest.updateMany({
        where: { id: deposit.id, status: "PENDING" },
        data: {
          status: "REJECTED",
          note: `midtrans:snap_error:${e instanceof Error ? e.message : "unknown"}`.slice(0, 500),
        },
      });
      return NextResponse.json(
        {
          ok: false,
          error:
            e instanceof Error
              ? `Gagal membuat transaksi Midtrans: ${e.message}`
              : "Gagal membuat transaksi Midtrans",
          // Reflect the REJECTED status we just wrote above so the client
          // doesn't treat this as still-PENDING and poll/retry on the dead row.
          deposit: { ...deposit, status: "REJECTED" as const },
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ ok: true, deposit });
}
