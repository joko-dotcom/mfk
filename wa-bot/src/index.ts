import pino from "pino";
import { startBot } from "./bot.js";
import { startWebhookServer } from "./webhook-server.js";

const logger = pino({ level: "info" });

async function main() {
  logger.info("starting Mafia Koi WhatsApp bot...");
  startWebhookServer();
  await startBot();
}

main().catch((e) => {
  logger.error(e, "fatal");
  process.exit(1);
});
