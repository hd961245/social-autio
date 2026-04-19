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
  anthropicApiKey: () => process.env.ANTHROPIC_API_KEY?.trim() || "",
  geminiApiKey: () => process.env.GEMINI_API_KEY?.trim() || "",
  ga4PropertyId: () => process.env.GA4_PROPERTY_ID?.trim() || "",
  ga4ClientEmail: () => process.env.GA4_CLIENT_EMAIL?.trim() || "",
  ga4PrivateKey: () => process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() || ""
};
