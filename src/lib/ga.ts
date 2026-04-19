import { createSign } from "node:crypto";
import { env } from "@/lib/env";

export type GaOverview = {
  configured: boolean;
  propertyId: string;
  source: string;
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    screenPageViews: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    users: number;
  }>;
  message: string;
};

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createJwt(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
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

async function getGoogleAccessToken() {
  const clientEmail = env.ga4ClientEmail();
  const privateKey = env.ga4PrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("Missing GA4 service account credentials");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createJwt(clientEmail, privateKey)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GA token error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function getGaOverview(): Promise<GaOverview> {
  const propertyId = env.ga4PropertyId();

  if (!propertyId || !env.ga4ClientEmail() || !env.ga4PrivateKey()) {
    return {
      configured: false,
      propertyId,
      source: "ga4",
      totals: {
        activeUsers: 0,
        newUsers: 0,
        sessions: 0,
        screenPageViews: 0
      },
      topPages: [],
      message: "尚未設定 GA4。先補 GA4_PROPERTY_ID、GA4_CLIENT_EMAIL、GA4_PRIVATE_KEY。"
    };
  }

  const accessToken = await getGoogleAccessToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`
  };

  const [totalsResponse, pagesResponse] = await Promise.all([
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "sessions" },
          { name: "screenPageViews" }
        ]
      })
    }),
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 5
      })
    })
  ]);

  if (!totalsResponse.ok) {
    const detail = await totalsResponse.text();
    throw new Error(`GA runReport error (${totalsResponse.status}): ${detail.slice(0, 400)}`);
  }

  if (!pagesResponse.ok) {
    const detail = await pagesResponse.text();
    throw new Error(`GA page report error (${pagesResponse.status}): ${detail.slice(0, 400)}`);
  }

  const totalsData = (await totalsResponse.json()) as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
  };
  const pagesData = (await pagesResponse.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  };

  const totalMetrics = totalsData.rows?.[0]?.metricValues ?? [];

  return {
    configured: true,
    propertyId,
    source: "ga4",
    totals: {
      activeUsers: Number(totalMetrics[0]?.value ?? 0),
      newUsers: Number(totalMetrics[1]?.value ?? 0),
      sessions: Number(totalMetrics[2]?.value ?? 0),
      screenPageViews: Number(totalMetrics[3]?.value ?? 0)
    },
    topPages: (pagesData.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "/",
      views: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0)
    })),
    message: "已連上 GA4，顯示近 30 天站點總覽。"
  };
}
