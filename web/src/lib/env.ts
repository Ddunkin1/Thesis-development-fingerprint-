// Central place for configuration. Everything comes from environment variables (Railway-ready).
// Nothing secret is hardcoded anywhere in the source.
function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  get databaseUrl() { return need("DATABASE_URL"); },
  get sessionSecret() { return need("SESSION_SECRET"); },
  get bridgeApiKey() { return need("BRIDGE_API_KEY"); },
  get timezone() { return process.env.APP_TIMEZONE || "Asia/Manila"; },
  get isProd() { return process.env.NODE_ENV === "production"; },
};
