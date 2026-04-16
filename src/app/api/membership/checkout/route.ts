import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { MembershipTier } from "@prisma/client";

// MVP: activate membership instantly (demo). Real impl should integrate Midtrans/Xendit.
export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.redirect(new URL("/auth/login?callbackUrl=/membership", req.url));
  }
  const url = new URL(req.url);
  const tier = url.searchParams.get("tier") as MembershipTier | null;
  if (!tier || !["SILVER", "GOLD", "PLATINUM"].includes(tier)) {
    return NextResponse.redirect(new URL("/membership", req.url));
  }
  const until = new Date();
  until.setMonth(until.getMonth() + 1);
  await prisma.user.update({
    where: { id: user.id },
    data: { membershipTier: tier, membershipUntil: until },
  });
  return NextResponse.redirect(new URL("/membership/success", req.url));
}
