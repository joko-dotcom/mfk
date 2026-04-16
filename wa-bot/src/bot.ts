import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
  type proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrTerminal from "qrcode-terminal";
import { config } from "./config.js";
import { parseMessage, HELP_TEXT } from "./commands.js";
import { postCommand } from "./app-client.js";

const logger = pino({ level: "info" });

let currentSock: WASocket | null = null;

function jidToPhone(jid: string): string {
  // Baileys user JIDs look like "628123456@s.whatsapp.net"
  return jid.split("@")[0].split(":")[0];
}

async function handleMessage(sock: WASocket, msg: proto.IWebMessageInfo) {
  if (!msg.message || msg.key.fromMe) return;
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;

  const body =
    msg.message.conversation ??
    msg.message.extendedTextMessage?.text ??
    msg.message.imageMessage?.caption ??
    msg.message.videoMessage?.caption ??
    "";
  if (!body) return;

  const parsed = parseMessage(body);
  if (!parsed) return;

  const isGroup = remoteJid.endsWith("@g.us");
  const senderJid = isGroup ? msg.key.participant ?? "" : remoteJid;
  const phone = jidToPhone(senderJid);
  const replyTo = remoteJid;

  const reply = (text: string) =>
    sock.sendMessage(replyTo, { text }, { quoted: msg });

  if (parsed.kind === "HELP") {
    await reply(HELP_TEXT);
    return;
  }
  if (parsed.kind === "UNKNOWN") {
    await reply(`❓ Perintah tidak dikenal. Kirim /help untuk daftar perintah.`);
    return;
  }

  if (parsed.kind === "LINK_VERIFY") {
    const r = await postCommand({
      command: "LINK_VERIFY",
      jid: senderJid,
      phone,
      code: parsed.code,
    });
    await reply(r.reply ?? (r.ok ? "✅ Terhubung" : r.error ?? "Gagal"));
    return;
  }

  if (parsed.kind === "MYACCOUNT") {
    const r = await postCommand({
      command: "MYACCOUNT",
      jid: senderJid,
      phone,
    });
    await reply(r.reply ?? (r.ok ? "ok" : r.error ?? "Gagal"));
    return;
  }

  if (parsed.kind === "GROUP_REGISTER") {
    if (!isGroup) {
      await reply("Perintah ini hanya bisa dipakai di dalam grup WhatsApp.");
      return;
    }
    const meta = await sock.groupMetadata(remoteJid).catch(() => null);
    const r = await postCommand({
      command: "GROUP_REGISTER",
      groupId: remoteJid,
      groupName: meta?.subject ?? "Unknown",
      sellerSlug: parsed.sellerSlug,
      adminPhone: phone,
    });
    await reply(r.reply ?? (r.ok ? "✅ Terdaftar" : r.error ?? "Gagal"));
    return;
  }

  if (parsed.kind === "BID") {
    if (parsed.auctionId === "__FEATURED__") {
      // We delegate to the webhook — Next.js can resolve featured auction per
      // group. For now, ask the user to use /bid with explicit id.
      await reply(
        "Fitur #BID untuk auction yang di-featured di grup akan aktif setelah seller set featured auction. Untuk sekarang pakai: /bid AUCTION_ID NOMINAL",
      );
      return;
    }
    const r = await postCommand({
      command: "BID",
      jid: senderJid,
      phone,
      auctionId: parsed.auctionId,
      amount: parsed.amount,
      groupId: isGroup ? remoteJid : undefined,
    });
    await reply(r.reply ?? (r.ok ? "✅ Bid berhasil" : r.error ?? "Gagal"));
    return;
  }
}

export async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: logger as unknown as pino.Logger,
    markOnlineOnConnect: false,
    browser: ["Mafia Koi Bot", "Chrome", "1.0.0"],
  });
  currentSock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      logger.info("Scan QR below in WhatsApp > Linked Devices to pair:");
      qrTerminal.generate(qr, { small: true });
    }
    if (connection === "open") {
      logger.info({ id: sock.user?.id }, "bot connected");
    }
    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom | undefined)?.output
        ?.statusCode;
      logger.warn({ reason }, "connection closed");
      if (reason === DisconnectReason.loggedOut) {
        logger.error("logged out; delete auth_info and re-pair");
      } else {
        // reconnect after a short delay
        setTimeout(() => {
          startBot().catch((e) => logger.error(e, "reconnect failed"));
        }, 3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      try {
        await handleMessage(sock, msg);
      } catch (e) {
        logger.error(e, "handleMessage failed");
      }
    }
  });

  return sock;
}

export function getSocket(): WASocket | null {
  return currentSock;
}
