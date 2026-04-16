import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const schema = z.object({ action: z.enum(["verify", "reject"]) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireRole(["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  const seller = await prisma.seller.update({
    where: { id: params.id },
    data:
      parsed.data.action === "verify"
        ? { verified: true, status: "VERIFIED" }
        : { verified: false, status: "REJECTED" },
  });
  return NextResponse.json({ ok: true, seller });
}
