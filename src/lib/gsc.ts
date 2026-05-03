import { createSign } from "node:crypto";
import { env } from "@/lib/env";

export type GscOverview = {
  configured: boolean;
  siteUrl: string;
  source: string;
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  message: string;
};

type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
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
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
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
  const clientEmail = env.gscClientEmail();
  const privateKey = env.gscPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Search Console service account credentials");
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
    throw new Error(`GSC token error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function runSearchConsoleQuery(accessToken: string, siteUrl: string, body: Record<string, unknown>) {
  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GSC query error (${response.status}): ${detail.slice(0, 400)}`);
  }

  return (await response.json()) as { rows?: SearchConsoleRow[] };
}

function sumRows(rows: SearchConsoleRow[]) {
  const totals = rows.reduce<{
    clicks: number;
    impressions: number;
    weightedPosition: number;
  }>(
    (accumulator, row) => {
      accumulator.clicks += row.clicks ?? 0;
      accumulator.impressions += row.impressions ?? 0;
      accumulator.weightedPosition += (row.position ?? 0) * (row.impressions ?? 0);
      return accumulator;
    },
    { clicks: 0, impressions: 0, weightedPosition: 0 }
  );

  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const position = totals.impressions > 0 ? totals.weightedPosition / totals.impressions : 0;

  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr,
    position
  };
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getGscOverview(): Promise<GscOverview> {
  const siteUrl = env.gscSiteUrl();

  if (!siteUrl || !env.gscClientEmail() || !env.gscPrivateKey()) {
    return {
      configured: false,
      siteUrl,
      source: "gsc",
      totals: {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0
      },
      topPages: [],
      topQueries: [],
      message: "尚未設定 Search Console。先補 GSC_SITE_URL，並確認 service account 有這個 property 的讀取權限。"
    };
  }

  const accessToken = await getGoogleAccessToken();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 27);
  const dateRange = {
    startDate: formatDateInput(startDate),
    endDate: formatDateInput(endDate)
  };
  const [totalsData, pagesData, queriesData] = await Promise.all([
    runSearchConsoleQuery(accessToken, siteUrl, {
      ...dateRange,
      dimensions: ["date"],
      rowLimit: 28,
      searchType: "web"
    }),
    runSearchConsoleQuery(accessToken, siteUrl, {
      ...dateRange,
      dimensions: ["page"],
      rowLimit: 5,
      searchType: "web"
    }),
    runSearchConsoleQuery(accessToken, siteUrl, {
      ...dateRange,
      dimensions: ["query"],
      rowLimit: 5,
      searchType: "web"
    })
  ]);

  const totalRows = totalsData.rows ?? [];
  const topPagesRows = pagesData.rows ?? [];
  const topQueryRows = queriesData.rows ?? [];
  const totals = sumRows(totalRows);

  return {
    configured: true,
    siteUrl,
    source: "gsc",
    totals,
    topPages: topPagesRows.map((row) => ({
      page: row.keys?.[0] ?? "/",
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
      ctr: row.ctr ?? 0,
      position: row.position ?? 0
    })),
    topQueries: topQueryRows.map((row) => ({
      query: row.keys?.[0] ?? "(unknown query)",
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
      ctr: row.ctr ?? 0,
      position: row.position ?? 0
    })),
    message: "已連上 Search Console，顯示近 28 天自然搜尋表現。"
  };
}
