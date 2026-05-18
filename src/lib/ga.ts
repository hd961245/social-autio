import { env } from "@/lib/env";
import { getGoogleAccessToken } from "@/lib/google-auth";
import { withRuntimeCache } from "@/lib/runtime-cache";

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

export async function getGaOverview(): Promise<GaOverview> {
  return withRuntimeCache("ga-overview", 10 * 60 * 1000, async () => {
    const propertyId = env.ga4PropertyId();
    const hasOauthUserCredentials =
      Boolean(env.googleOauthClientId()) && Boolean(env.googleOauthClientSecret()) && Boolean(env.googleOauthRefreshToken());
    const hasServiceAccountCredentials = Boolean(env.ga4ClientEmail()) && Boolean(env.ga4PrivateKey());

    if (!propertyId || (!hasOauthUserCredentials && !hasServiceAccountCredentials)) {
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
        message:
          "尚未設定 GA4。可用 service account（GA4_PROPERTY_ID、GA4_CLIENT_EMAIL、GA4_PRIVATE_KEY）或 Google OAuth 使用者憑證（GOOGLE_OAUTH_CLIENT_ID、GOOGLE_OAUTH_CLIENT_SECRET、GOOGLE_OAUTH_REFRESH_TOKEN）。"
      } satisfies GaOverview;
    }

    const { accessToken, source } = await getGoogleAccessToken({
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      serviceAccountEmail: env.ga4ClientEmail(),
      serviceAccountPrivateKey: env.ga4PrivateKey(),
      serviceAccountLabel: "GA4 service account credentials"
    });
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
      source,
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
      message:
        source === "oauth_user"
          ? "已用你的 Google OAuth 帳號連上 GA4，顯示近 30 天站點總覽。"
          : "已連上 GA4，顯示近 30 天站點總覽。"
    } satisfies GaOverview;
  });
}
