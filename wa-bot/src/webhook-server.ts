import express from "express";
import pino from "pino";
import { config } from "./config.js";
import { getSocket } from "./bot.js";

const logger = pino({ level: "info" });

export function startWebhookServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.use((req, res, next) => {
    if (req.path === "/health") return next();
    const secret = req.header("x-wa-secret");
    if (secret !== config.waBotSecret) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    next();
  });

  app.get("/health", (_req, res) => {
    const sock = getSocket();
    res.json({
      ok: true,
      connected: Boolean(sock?.user),
      me: sock?.user?.id ?? null,
    });
  });

  app.post("/send/dm", async (req, res) => {
    const sock = getSocket();
    if (!sock?.user) return res.status(503).json({ ok: false, error: "not connected" });
    const { jid, text } = req.body as { jid?: string; text?: string };
    if (!jid || !text) return res.status(400).json({ ok: false, error: "jid+text required" });
    try {
      await sock.sendMessage(jid, { text });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e instanceof Error ? e.message : "send failed" });
    }
  });

  app.post("/send/group", async (req, res) => {
    const sock = getSocket();
    if (!sock?.user) return res.status(503).json({ ok: false, error: "not connected" });
    const { groupId, text } = req.body as { groupId?: string; text?: string };
    if (!groupId || !text) return res.status(400).json({ ok: false, error: "groupId+text required" });
    try {
      await sock.sendMessage(groupId, { text });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e instanceof Error ? e.message : "send failed" });
    }
  });

  app.post("/send/broadcast", async (req, res) => {
    const sock = getSocket();
    if (!sock?.user) return res.status(503).json({ ok: false, error: "not connected" });
    const { groupIds, text } = req.body as { groupIds?: string[]; text?: string };
    if (!Array.isArray(groupIds) || !text) {
      return res.status(400).json({ ok: false, error: "groupIds[]+text required" });
    }
    const results = await Promise.allSettled(
      groupIds.map((g) => sock.sendMessage(g, { text })),
    );
    res.json({
      ok: true,
      sent: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    });
  });

  app.listen(config.port, () => {
    logger.info(`wa-bot webhook listening on :${config.port}`);
  });
}
