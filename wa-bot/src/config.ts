import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const config = {
  waBotSecret: required("WA_BOT_SECRET", "dev-secret"),
  mainAppUrl: required("MAIN_APP_URL", "http://localhost:3000").replace(/\/$/, ""),
  port: Number(process.env.WA_BOT_PORT ?? 4000),
  authDir: process.env.WA_AUTH_DIR ?? "./auth_info",
};
