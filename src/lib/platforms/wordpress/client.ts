import { decryptString } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type WordPressAccountContext = {
  siteUrl: string;
  username: string;
  appPassword: string;
};

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
    throw new Error(`WordPress API error (${response.status}): ${message}`);
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
    throw new Error(`WordPress API error (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}
