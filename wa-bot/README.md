# Mafia Koi WhatsApp Bot

Long-running Node service that bridges WhatsApp (via [Baileys](https://github.com/WhiskeySockets/Baileys))
to the main Mafia Koi Next.js app. Handles:

- **Bid via WhatsApp** — users DM `/bid AUCTION_ID NOMINAL` or post `#BID NOMINAL` in a group.
- **Account linking** — `/link CODE` pairs a WhatsApp number with a platform account.
- **Seller operator** — admin bot that auto-broadcasts bid-and-run alerts and auction
  winners into the seller's WhatsApp group.
- **Webhook receiver** — exposes `/send/dm`, `/send/group`, `/send/broadcast`
  endpoints that the Next.js cron/hooks call whenever they want the bot to push
  messages.

## Why a separate service?

Baileys uses a persistent WebSocket connection to WhatsApp and holds auth state
on disk. This is **not compatible with Vercel serverless**. Deploy it to
Railway / Fly.io / Render / a small VPS. The main Next.js app runs on Vercel as
usual and talks to the bot via HTTPS.

## Local dev

```bash
cd wa-bot
cp .env.example .env
# edit WA_BOT_SECRET and MAIN_APP_URL (point to your local Next.js or tunnel)
npm install
npm run dev
```

On first run, scan the QR code printed in the terminal with WhatsApp → "Linked
Devices" → "Link a device". Credentials are persisted in `auth_info/`.

## Production deploy (Railway example)

1. Push this monorepo to GitHub.
2. In Railway, **New Project → Deploy from GitHub** and pick `wa-bot/` as the root.
3. Set env vars: `WA_BOT_SECRET`, `MAIN_APP_URL`, `WA_BOT_PORT=4000`.
4. Add a persistent volume mounted at `/app/auth_info` (1 GB is plenty).
5. Expose port 4000 and copy the generated URL.
6. On the Next.js side set `WA_BOT_URL` = that URL and the same `WA_BOT_SECRET`.
7. SSH / `railway run node dist/index.js` once interactively to scan the QR the
   first time (or run locally once with the production `WA_AUTH_DIR` volume
   mounted, then upload the `auth_info` folder).

## Security notes

- Baileys is an **unofficial** client. Meta may ban numbers. Use a dedicated
  SIM, not the owner's personal number.
- `/send/*` endpoints are guarded by `x-wa-secret`. Rotate this secret if leaked.
- The bot never exposes your Prisma database directly — all DB writes happen
  through the Next.js `/api/wa/webhook`, so the bot can live in an untrusted
  network without extra blast radius.

## Commands supported

| Where     | Command                          | Effect                                      |
|-----------|----------------------------------|---------------------------------------------|
| DM        | `/help`                          | List commands                               |
| DM        | `/link CODE`                     | Link WhatsApp number to account             |
| DM        | `/bid AUCTION_ID NOMINAL`        | Place bid                                   |
| DM        | `/myaccount`                     | Show account info + strikes                 |
| Group     | `#BID NOMINAL`                   | Bid on featured auction (seller sets)       |
| Group     | `/registergroup FARM_SLUG`       | Register group as operator for a farm       |
