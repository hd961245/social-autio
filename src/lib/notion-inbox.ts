import { env } from "@/lib/env";

const NOTION_VERSION = "2022-06-28";
const INBOX_DB_ID    = "2adf96f434d681cda8daea3d4ef0b5c9";

type NotionPage = {
  id: string;
  created_time: string;
  properties: Record<string, unknown>;
};

type NotionQueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

type NotionBlock = {
  type: string;
  paragraph?: {
    rich_text: Array<{ plain_text: string }>;
  };
};

type NotionBlocksResponse = {
  results: NotionBlock[];
};

function notionHeaders() {
  return {
    Authorization: `Bearer ${env.notionApiKey()}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

function extractTitle(page: NotionPage): string {
  const prop = page.properties["一句話結論／標題"] as { title?: Array<{ plain_text: string }> } | undefined;
  return prop?.title?.[0]?.plain_text?.trim() || "";
}

function extractUrl(page: NotionPage): string {
  const prop = page.properties["URL"] as { url?: string | null } | undefined;
  return prop?.url?.trim() || "";
}

async function fetchPageBlocks(pageId: string): Promise<string> {
  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=10`, {
      headers: notionHeaders(),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as NotionBlocksResponse;
    return data.results
      .filter((b) => b.type === "paragraph")
      .map((b) => b.paragraph?.rich_text.map((t) => t.plain_text).join("") ?? "")
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

export type InboxItem = {
  pageId: string;
  createdAt: string;
  title: string;
  url: string;
  bodyText: string;
};

export async function fetchRecentInboxItems(since: Date): Promise<InboxItem[]> {
  const apiKey = env.notionApiKey();
  if (!apiKey) return [];

  const res = await fetch(`https://api.notion.com/v1/databases/${INBOX_DB_ID}/query`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: {
        timestamp: "created_time",
        created_time: { after: since.toISOString() },
      },
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
      page_size: 20,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Notion API error (${res.status}): ${err}`);
  }

  const data = (await res.json()) as NotionQueryResponse;

  const items = await Promise.all(
    data.results.map(async (page) => {
      const title = extractTitle(page);
      const url   = extractUrl(page);
      const bodyText = title.length > 100 ? await fetchPageBlocks(page.id) : "";
      return {
        pageId:    page.id.replace(/-/g, ""),
        createdAt: page.created_time,
        title,
        url,
        bodyText,
      };
    })
  );

  return items.filter((item) => item.title);
}
