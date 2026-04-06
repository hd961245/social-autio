import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

function matchesKeyword(keyword: string, matchMode: string, text: string) {
  if (!text) {
    return false;
  }

  if (matchMode === "exact") {
    return text.trim().toLowerCase() === keyword.trim().toLowerCase();
  }

  if (matchMode === "regex") {
    try {
      return new RegExp(keyword, "i").test(text);
    } catch {
      return false;
    }
  }

  return text.toLowerCase().includes(keyword.toLowerCase());
}

export async function scanKeywordMatches() {
  const settings = await prisma.appSettings.findFirst();

  if (settings?.keywordScanPaused) {
    return {
      scannedAccounts: 0,
      scannedPosts: 0,
      scannedReplies: 0,
      newMatches: 0,
      paused: true
    };
  }

  const [keywords, accounts] = await Promise.all([
    prisma.keyword.findMany({ where: { isActive: true } }),
    prisma.platformAccount.findMany({
      where: {
        isActive: true,
        platform: "threads"
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  let scannedPosts = 0;
  let scannedReplies = 0;
  let newMatches = 0;

  for (const account of accounts) {
    const adapter = getPlatformAdapter("threads");
    let ownPosts: Awaited<ReturnType<typeof adapter.getOwnPosts>> = [];

    try {
      ownPosts = await adapter.getOwnPosts(account.id, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    } catch {
      continue;
    }

    scannedPosts += ownPosts.length;

    for (const sourcePost of ownPosts) {
      let replies: Awaited<ReturnType<typeof adapter.getPostReplies>> = [];

      try {
        replies = await adapter.getPostReplies(account.id, sourcePost.id);
      } catch {
        continue;
      }

      scannedReplies += replies.length;

      for (const reply of replies) {
        for (const keyword of keywords) {
          if (!matchesKeyword(keyword.keyword, keyword.matchMode, reply.text)) {
            continue;
          }

          try {
            await prisma.keywordMatch.create({
              data: {
                keywordId: keyword.id,
                accountId: account.id,
                platformPostId: reply.id,
                sourcePostId: sourcePost.id,
                authorUsername: reply.username,
                postText: reply.text,
                postUrl: null
              }
            });
            newMatches += 1;
          } catch {}
        }
      }
    }
  }

  return {
    scannedAccounts: accounts.length,
    scannedPosts,
    scannedReplies,
    newMatches,
    paused: false
  };
}
