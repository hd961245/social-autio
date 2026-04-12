import { decryptString } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type WordPressAccountContext = {
  siteUrl: string;
  username: string;
  appPassword: string;
};

type WordPressDiagnostic = {
  ok: boolean;
  stage: "site" | "auth";
  message: string;
  hints: string[];
};

export type { WordPressDiagnostic };

export async function getWordPressAccountContext(accountId: string): Promise<WordPressAccountContext> {
  const account = await prisma.platformAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("找不到指定的 WordPress 帳號。");
  }

  return {
    siteUrl: account.platformUserId,
    username: account.platformUsername,
    appPassword: decryptString(account.accessToken)
  };
}

export async function wordpressFetch<T>(
  siteUrl: string,
  username: string,
  appPassword: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = new URL(path, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`);
  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(formatWordPressError(response.status, message));
  }

  return response.json() as Promise<T>;
}

export async function wordpressRawFetch<T>(
  siteUrl: string,
  username: string,
  appPassword: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = new URL(path, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`);
  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(formatWordPressError(response.status, message));
  }

  return response.json() as Promise<T>;
}

function formatWordPressError(status: number, rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage) as {
      code?: string;
      message?: string;
    };

    if (status === 401 && parsed.code === "rest_not_logged_in") {
      return "WordPress 沒接受這組登入資訊。請確認：1. 你填的是 WordPress 真正的登入帳號，不是顯示名稱。2. 使用的是 Application Password，不是一般密碼。3. 網站有開 HTTPS。4. 主機或外掛沒有擋掉 Authorization header。";
    }

    if (status === 403) {
      return parsed.message
        ? `WordPress 拒絕了這次操作：${parsed.message}`
        : "WordPress 拒絕了這次操作，可能是帳號權限不足或 REST API 被安全規則擋住。";
    }

    if (parsed.message) {
      return `WordPress API error (${status}): ${parsed.message}`;
    }
  } catch {}

  return `WordPress API error (${status}): ${rawMessage}`;
}

export async function diagnoseWordPressConnection(
  siteUrl: string,
  username: string,
  appPassword: string
): Promise<WordPressDiagnostic> {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, "");

  try {
    const siteResponse = await fetch(new URL("/wp-json/", normalizedSiteUrl));

    if (!siteResponse.ok) {
      return {
        ok: false,
        stage: "site",
        message: `WordPress REST API 無法存取（${siteResponse.status}）。`,
        hints: [
          "確認網站網址正確，並且可以打開 /wp-json/。",
          "確認網站沒有用安全外掛或 Cloudflare 封鎖 API。",
          "如果是內網或白名單站台，Zeabur 也必須能連到它。"
        ]
      };
    }
  } catch {
    return {
      ok: false,
      stage: "site",
      message: "無法連到 WordPress 網站或 /wp-json/ 端點。",
      hints: ["確認 site URL 正確。", "確認網站有公開 HTTPS。", "確認主機沒有擋掉外部請求。"]
    };
  }

  try {
    await wordpressFetch(normalizedSiteUrl, username, appPassword, "/wp-json/wp/v2/users/me");

    return {
      ok: true,
      stage: "auth",
      message: "WordPress 連接檢查通過。",
      hints: []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "WordPress 驗證失敗";

    return {
      ok: false,
      stage: "auth",
      message,
      hints: [
        "確認你填的是 WordPress 真正登入帳號，不是顯示名稱。",
        "確認你使用的是 Application Password，不是一般登入密碼。",
        "如果站台有安全外掛或 Nginx/Apache 規則，確認 Authorization header 沒被吃掉。",
        "Apache 可嘗試在 .htaccess 加上：RewriteRule .* - [E=HTTP_AUTHORIZATION:%1]",
        "Nginx 可嘗試加入：fastcgi_param HTTP_AUTHORIZATION $http_authorization;"
      ]
    };
  }
}
