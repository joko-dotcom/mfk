// Generate a 6-char code the user pastes into WhatsApp DM with the bot to link
// their account. Code expires in 10 minutes.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const code =
    Math.random().toString(36).slice(2, 8).toUpperCase() +
    Math.random().toString(36).slice(2, 4).toUpperCase();
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { waLinkCode: code, waLinkExpires: expires },
  });
  return NextResponse.json({
    ok: true,
    code,
    expiresAt: expires.toISOString(),
    instruction: `Buka WhatsApp, kirim ke bot Mafia Koi: /link ${code}`,
  });
}
