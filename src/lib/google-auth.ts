import { createSign } from "node:crypto";
import { env } from "@/lib/env";

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createServiceAccountJwt(clientEmail: string, privateKey: string, scope: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey);

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

type GoogleAccessTokenOptions = {
  scope: string;
  serviceAccountEmail?: string;
  serviceAccountPrivateKey?: string;
  serviceAccountLabel: string;
};

export async function getGoogleAccessToken(options: GoogleAccessTokenOptions) {
  const oauthClientId = env.googleOauthClientId();
  const oauthClientSecret = env.googleOauthClientSecret();
  const oauthRefreshToken = env.googleOauthRefreshToken();

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        refresh_token: oauthRefreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Google OAuth refresh error (${response.status}): ${detail.slice(0, 400)}`);
    }

    const data = (await response.json()) as { access_token: string };

    return {
      accessToken: data.access_token,
      source: "oauth_user" as const
    };
  }

  const clientEmail = options.serviceAccountEmail;
  const privateKey = options.serviceAccountPrivateKey;

  if (!clientEmail || !privateKey) {
    throw new Error(`Missing ${options.serviceAccountLabel} or Google OAuth user credentials`);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createServiceAccountJwt(clientEmail, privateKey, options.scope)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google service account token error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as { access_token: string };

  return {
    accessToken: data.access_token,
    source: "service_account" as const
  };
}
