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
import type { PaymentMethod } from "@prisma/client";

const schema = z.object({
  amount: z.number().int().positive(),
  method: z.enum(["MOCK", "MIDTRANS", "XENDIT", "MANUAL_BANK_TRANSFER"]).default("MOCK"),
  purpose: z.enum(["BUYER", "SELLER"]).default("BUYER"),
  note: z.string().max(500).optional(),
});

const AUTO_APPROVE = process.env.PLATFORM_DEPOSIT_AUTO_APPROVE !== "false";

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

  return NextResponse.json({ ok: true, deposit });
}
