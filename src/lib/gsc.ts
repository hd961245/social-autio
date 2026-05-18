import { env } from "@/lib/env";
import { getGoogleAccessToken } from "@/lib/google-auth";
import { withRuntimeCache } from "@/lib/runtime-cache";

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

export type GscOpportunity = {
  id: string;
  page: string;
  query?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  lane: "refresh" | "expand" | "capture";
  label: string;
  reason: string;
  action: string;
  confidence: "high" | "medium" | "low";
  href: string;
};

type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

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
  return withRuntimeCache("gsc-overview", 10 * 60 * 1000, async () => {
    const siteUrl = env.gscSiteUrl();
    const hasOauthUserCredentials =
      Boolean(env.googleOauthClientId()) && Boolean(env.googleOauthClientSecret()) && Boolean(env.googleOauthRefreshToken());
    const hasServiceAccountCredentials = Boolean(env.gscClientEmail()) && Boolean(env.gscPrivateKey());

    if (!siteUrl || (!hasOauthUserCredentials && !hasServiceAccountCredentials)) {
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
        message:
          "尚未設定 Search Console。可用 service account，或 Google OAuth 使用者憑證（GOOGLE_OAUTH_CLIENT_ID、GOOGLE_OAUTH_CLIENT_SECRET、GOOGLE_OAUTH_REFRESH_TOKEN），並確認該帳號對 property 有讀取權限。"
      } satisfies GscOverview;
    }

    const { accessToken, source } = await getGoogleAccessToken({
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      serviceAccountEmail: env.gscClientEmail(),
      serviceAccountPrivateKey: env.gscPrivateKey(),
      serviceAccountLabel: "Search Console service account credentials"
    });
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
      source,
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
      message:
        source === "oauth_user"
          ? "已用你的 Google OAuth 帳號連上 Search Console，顯示近 28 天自然搜尋表現。"
          : "已連上 Search Console，顯示近 28 天自然搜尋表現。"
    } satisfies GscOverview;
  });
}

export async function getGscOpportunityQueue(): Promise<{
  configured: boolean;
  items: GscOpportunity[];
  message: string;
}> {
  const overview = await getGscOverview();

  if (!overview.configured) {
    return {
      configured: false,
      items: [],
      message: overview.message
    };
  }

  const pageItems = overview.topPages.map((page, index) => {
    const lowCtrHighImpression = page.impressions >= 80 && page.ctr <= 0.025;
    const rankingOpportunity = page.position >= 4 && page.position <= 15;
    const expansionOpportunity = page.clicks >= 12 && page.position >= 8;

    let lane: GscOpportunity["lane"] = "refresh";
    let label = "舊文更新";
    let action = "補 title / desc / CTA";
    let confidence: GscOpportunity["confidence"] = "medium";
    const reasons: string[] = [];

    if (lowCtrHighImpression) {
      reasons.push("曝光夠高，但 CTR 偏低，適合先改 title / desc。");
      confidence = "high";
    }

    if (rankingOpportunity) {
      reasons.push("排名卡在第 4 到 15 名，最值得補內容結構與內鏈。");
    }

    if (expansionOpportunity) {
      lane = "expand";
      label = "長文擴寫";
      action = "補段落 / FAQ / 內鏈";
      reasons.push("已經有點擊基礎，適合加長文與更多搜尋承接。");
    }

    if (!lowCtrHighImpression && !rankingOpportunity && !expansionOpportunity) {
      lane = "capture";
      label = "關鍵字佔位";
      action = "觀察後決定是否寫 follow-up";
      confidence = "low";
      reasons.push("目前已有搜尋訊號，但還不夠強，先收進觀察池。");
    }

    return {
      id: `page-${index}-${page.page}`,
      page: page.page,
      clicks: page.clicks,
      impressions: page.impressions,
      ctr: page.ctr,
      position: page.position,
      lane,
      label,
      reason: reasons[0] ?? "這頁已有自然搜尋訊號，可納入 SEO 優化飛輪。",
      action,
      confidence,
      href: "/wordpress"
    } satisfies GscOpportunity;
  });

  const queryItems = overview.topQueries
    .filter((query) => query.impressions >= 60 && query.position >= 4 && query.position <= 20)
    .slice(0, 3)
    .map((query, index) => {
      const confidence: GscOpportunity["confidence"] = query.impressions >= 120 ? "high" : "medium";

      return {
        id: `query-${index}-${query.query}`,
        page: "(query opportunity)",
        query: query.query,
        clicks: query.clicks,
        impressions: query.impressions,
        ctr: query.ctr,
        position: query.position,
        lane: "capture" as const,
        label: "新題佔位",
        reason: "查詢本身有曝光，但站上還可能缺更直接承接這個搜尋意圖的內容。",
        action: "產新的 WordPress / Threads 題目",
        confidence,
        href: "/factory"
      } satisfies GscOpportunity;
    });

  const items = [...pageItems, ...queryItems]
    .sort((left, right) => {
      const leftScore = left.impressions + left.clicks * 4 - left.position * 5 + (left.confidence === "high" ? 80 : left.confidence === "medium" ? 40 : 0);
      const rightScore = right.impressions + right.clicks * 4 - right.position * 5 + (right.confidence === "high" ? 80 : right.confidence === "medium" ? 40 : 0);
      return rightScore - leftScore;
    })
    .slice(0, 6);

  return {
    configured: true,
    items,
    message: items.length
      ? "已根據 Search Console 整理出最值得先補的 SEO 機會頁與關鍵字。"
      : "目前還沒有足夠明顯的 GSC 機會頁，先繼續累積搜尋訊號。"
  };
}
