function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  adminPassword: () => required("ADMIN_PASSWORD"),
  adminSessionSecret: () => required("ADMIN_SESSION_SECRET"),
  threadsAppId: () => required("THREADS_APP_ID"),
  threadsAppSecret: () => required("THREADS_APP_SECRET"),
  threadsRedirectUri: () => required("THREADS_REDIRECT_URI"),
  tokenEncryptionKey: () => required("TOKEN_ENCRYPTION_KEY"),
  openaiApiKey: () => process.env.OPENAI_API_KEY?.trim() || "",
  openaiBaseUrl: () => process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1",
  openaiModel: () => process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
  anthropicApiKey: () => process.env.ANTHROPIC_API_KEY?.trim() || "",
  geminiApiKey: () => process.env.GEMINI_API_KEY?.trim() || "",
  geminiModel: () => process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite",
  discordDailyWebhookUrl: () => process.env.DISCORD_DAILY_WEBHOOK_URL?.trim() || "",
  telegramBotToken: () => process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
  telegramChatId: () => process.env.TELEGRAM_CHAT_ID?.trim() || "",
  appBaseUrl: () => process.env.APP_BASE_URL?.trim() || process.env.INNGEST_SERVE_ORIGIN?.trim() || "",
  googleOauthClientId: () => process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || "",
  googleOauthClientSecret: () => process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || "",
  googleOauthRefreshToken: () => process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim() || "",
  ga4PropertyId: () => process.env.GA4_PROPERTY_ID?.trim() || "",
  ga4ClientEmail: () => process.env.GA4_CLIENT_EMAIL?.trim() || "",
  ga4PrivateKey: () => process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() || "",
  gscSiteUrl: () => process.env.GSC_SITE_URL?.trim() || "",
  gscClientEmail: () => process.env.GSC_CLIENT_EMAIL?.trim() || process.env.GA4_CLIENT_EMAIL?.trim() || "",
  gscPrivateKey: () =>
    process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() ||
    process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() ||
    ""
};
