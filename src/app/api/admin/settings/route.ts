import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  auctionFeeBps: z.number().int().min(0).max(5000).optional(),
  listingFeeIDR: z.number().int().min(0).optional(),
  silverPriceIDR: z.number().int().min(0).optional(),
  goldPriceIDR: z.number().int().min(0).optional(),
  platinumPriceIDR: z.number().int().min(0).optional(),
  minBuyerDepositIDR: z.number().int().min(0).optional(),
  minSellerDepositIDR: z.number().int().min(0).optional(),
  bnrPenaltyBps: z.number().int().min(0).max(10000).optional(),
  bnrStrikesForBan: z.number().int().min(1).max(10).optional(),
  withdrawalFeeIDR: z.number().int().min(0).optional(),
  withdrawalMinIDR: z.number().int().min(0).optional(),
  azukariMonthlyFeeIDR: z.number().int().min(0).optional(),
  kcFeeBps: z.number().int().min(0).max(5000).optional(),
  paymentMethodDefault: z.enum(["MOCK", "MIDTRANS", "XENDIT", "MANUAL_BANK_TRANSFER"]).optional(),
  waBotNumber: z.string().max(30).optional(),
  waAutoReply: z.string().max(500).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const setting = (await prisma.platformSetting.findFirst()) ?? (await prisma.platformSetting.create({ data: {} }));
  return NextResponse.json({ setting });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid", issues: parsed.error.flatten() }, { status: 400 });
  }

  const current = await prisma.platformSetting.findFirst();
  if (!current) {
    const created = await prisma.platformSetting.create({ data: parsed.data });
    return NextResponse.json({ ok: true, setting: created });
  }
  const updated = await prisma.platformSetting.update({
    where: { id: current.id },
    data: parsed.data,
  });
  return NextResponse.json({ ok: true, setting: updated });
}
