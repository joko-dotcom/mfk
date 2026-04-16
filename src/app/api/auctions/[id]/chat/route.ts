import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { publish } from "@/lib/bid-bus";

const schema = z.object({ message: z.string().min(1).max(500) });

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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }

  const chat = await prisma.liveChat.create({
    data: {
      auctionId: params.id,
      userId: user.id,
      message: parsed.data.message,
    },
  });

  publish({
    type: "chat",
    auctionId: params.id,
    userId: user.id,
    userName: user.name ?? "User",
    message: parsed.data.message,
    at: chat.createdAt.toISOString(),
  });

  return NextResponse.json({ ok: true });
}
