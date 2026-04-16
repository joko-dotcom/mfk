// Command parser — converts raw WA message text into structured commands
// that map 1:1 to the Next.js /api/wa/webhook handlers.

export type ParsedCommand =
  | { kind: "LINK_VERIFY"; code: string }
  | { kind: "BID"; auctionId: string; amount: number }
  | { kind: "MYACCOUNT" }
  | { kind: "HELP" }
  | { kind: "GROUP_REGISTER"; sellerSlug: string }
  | { kind: "UNKNOWN"; raw: string }
  | null;

const HELP_TEXT =
  `*Mafia Koi Bot — Perintah*\n\n` +
  `DM ke bot:\n` +
  `• /link KODE — hubungkan nomor WA ke akun (ambil kode di /account/whatsapp)\n` +
  `• /bid AUCTION_ID NOMINAL — pasang bid (contoh: /bid clx123abc 5000000)\n` +
  `• /myaccount — info akun & strike bid-and-run\n` +
  `• /help — tampilkan perintah ini\n\n` +
  `Di grup seller:\n` +
  `• #BID NOMINAL — bid pada auction yang di-featured di grup (admin set dulu)\n` +
  `• /registergroup FARM_SLUG — daftarkan grup ini sebagai grup operator farm\n`;

const AMOUNT_RX = /^[\d.,]+$/;

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[.,_\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function parseMessage(text: string): ParsedCommand {
  if (!text) return null;
  const trimmed = text.trim();

  // Group shorthand: "#BID 5.000.000"
  const hashBid = trimmed.match(/^#\s*bid\s+([\d.,_\s]+)$/i);
  if (hashBid) {
    const amount = parseAmount(hashBid[1]);
    if (!amount) return { kind: "UNKNOWN", raw: trimmed };
    return { kind: "BID", auctionId: "__FEATURED__", amount };
  }

  if (!trimmed.startsWith("/")) return null;
  const [cmdRaw, ...rest] = trimmed.slice(1).split(/\s+/);
  const cmd = cmdRaw.toLowerCase();

  if (cmd === "help" || cmd === "start") {
    return { kind: "HELP" };
  }
  if (cmd === "myaccount" || cmd === "me") {
    return { kind: "MYACCOUNT" };
  }
  if (cmd === "link") {
    const code = rest[0]?.toUpperCase();
    if (!code || !AMOUNT_RX.test(code.replace(/[A-Z0-9]/g, "0"))) {
      // code should be alnum
    }
    if (!code) return { kind: "UNKNOWN", raw: trimmed };
    return { kind: "LINK_VERIFY", code };
  }
  if (cmd === "bid") {
    const [auctionId, amountRaw] = rest;
    if (!auctionId || !amountRaw) return { kind: "UNKNOWN", raw: trimmed };
    const amount = parseAmount(amountRaw);
    if (!amount) return { kind: "UNKNOWN", raw: trimmed };
    return { kind: "BID", auctionId, amount };
  }
  if (cmd === "registergroup") {
    const slug = rest[0];
    if (!slug) return { kind: "UNKNOWN", raw: trimmed };
    return { kind: "GROUP_REGISTER", sellerSlug: slug };
  }

  return { kind: "UNKNOWN", raw: trimmed };
}

export { HELP_TEXT };
