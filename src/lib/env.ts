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
  tokenEncryptionKey: () => required("TOKEN_ENCRYPTION_KEY")
};

