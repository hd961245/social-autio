import { prisma } from "@/lib/prisma";

function stripText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export async function buildAccountStyleMemory(accountId: string) {
  const [settings, recentPosts] = await Promise.all([
    prisma.appSettings.findFirst({
      select: {
        writingStyleProfile: true
      }
    }),
    prisma.post.findMany({
      where: {
        accountId,
        status: "published",
        textContent: {
          not: null
        }
      },
      orderBy: {
        publishedAt: "desc"
      },
      take: 3,
      select: {
        textContent: true
      }
    })
  ]);

  const recentThreadsBlock = recentPosts
    .map((post, index) => {
      const text = stripText(post.textContent ?? "").slice(0, 220);
      if (!text) {
        return "";
      }

      return `近期已發布 Threads 範例 ${index + 1}：${text}`;
    })
    .filter(Boolean)
    .join("\n");

  return [settings?.writingStyleProfile?.trim() ? `你的長文寫作習慣：${settings.writingStyleProfile.trim()}` : "", recentThreadsBlock]
    .filter(Boolean)
    .join("\n\n");
}
