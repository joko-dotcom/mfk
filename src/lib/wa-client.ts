// HTTP client used by Next.js to push broadcasts / alerts to the wa-bot service.
// The wa-bot service is a long-running Node process (Baileys) that cannot be
// hosted on Vercel, so it lives in `wa-bot/` and is deployed to Railway / Fly /
// a VPS. Communication is signed by a shared secret (WA_BOT_SECRET).

type WaPayload = Record<string, unknown>;

async function call(path: string, payload: WaPayload): Promise<{ ok: boolean; error?: string }> {
  const base = process.env.WA_BOT_URL;
  const secret = process.env.WA_BOT_SECRET;
  if (!base || !secret) {
    // In MVP/local mode without a bot running we just log and no-op so the
    // main app keeps working even if the WA bot is offline.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info("[wa-client] bot not configured, skipping", path, payload);
    }
    return { ok: false, error: "wa-bot not configured" };
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wa-secret": secret,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `bot ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export async function sendDirectMessage(jid: string, text: string) {
  return call("/send/dm", { jid, text });
}

export async function sendGroupMessage(groupId: string, text: string) {
  return call("/send/group", { groupId, text });
}

export async function broadcastToSellerGroups(
  groupIds: string[],
  text: string,
) {
  if (!groupIds.length) return { ok: true };
  return call("/send/broadcast", { groupIds, text });
}

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  // Normalize Indonesian numbers: 08xxxx -> 628xxxx, otherwise assume already E.164 without '+'
  let e164 = digits;
  if (digits.startsWith("0")) e164 = "62" + digits.slice(1);
  if (e164.length < 10 || e164.length > 15) return null;
  return e164;
}

export function phoneToJid(e164: string): string {
  return `${e164}@s.whatsapp.net`;
}
