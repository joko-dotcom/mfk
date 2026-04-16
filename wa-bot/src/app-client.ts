import { config } from "./config.js";

// Thin HTTP client that forwards parsed WhatsApp commands to Next.js webhook.
// The Next.js side owns all DB mutations — this bot is just transport.

type WebhookReply = { ok: boolean; reply?: string; error?: string };

export async function postCommand(
  payload: Record<string, unknown>,
): Promise<WebhookReply> {
  try {
    const res = await fetch(`${config.mainAppUrl}/api/wa/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wa-secret": config.waBotSecret,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `app ${res.status}: ${text.slice(0, 200)}` };
    }
    return (await res.json()) as WebhookReply;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}
