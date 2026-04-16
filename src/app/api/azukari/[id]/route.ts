// Finalize or cancel an Azukari contract.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const actSchema = z.object({
  action: z.enum(["FINISH", "CANCEL"]),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = actSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const { action, note } = parsed.data;

  const item = await prisma.azukariContract.findUnique({ where: { id: params.id } });
  if (!item) {
    return NextResponse.json({ error: "Azukari tidak ditemukan" }, { status: 404 });
  }
  const isOwner = item.ownerUserId === user.id;
  const isHost = user.sellerId != null && item.hostSellerId === user.sellerId;
  if (!isOwner && !isHost) {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  }

  const status = action === "FINISH" ? "FINISHED" : "CANCELLED";
  const updated = await prisma.azukariContract.update({
    where: { id: item.id },
    data: {
      status,
      endDate: new Date(),
      note: note ?? item.note,
    },
  });
  return NextResponse.json({ ok: true, item: updated });
}
