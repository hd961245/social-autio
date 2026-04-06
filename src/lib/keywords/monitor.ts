export async function scanKeywordMatches() {
  const { prisma } = await import("@/lib/prisma");

  const [keywords, posts] = await Promise.all([
    prisma.keyword.findMany({ where: { isActive: true } }),
    prisma.post.findMany({
      where: {
        status: "published",
        textContent: {
          not: null
        }
      },
      include: {
        account: true
      },
      take: 50
    })
  ]);

  let newMatches = 0;

  for (const keyword of keywords) {
    for (const post of posts) {
      const text = post.textContent ?? "";
      const matched =
        keyword.matchMode === "exact"
          ? text === keyword.keyword
          : keyword.matchMode === "regex"
            ? new RegExp(keyword.keyword, "i").test(text)
            : text.toLowerCase().includes(keyword.keyword.toLowerCase());

      if (!matched) {
        continue;
      }

      try {
        await prisma.keywordMatch.create({
          data: {
            keywordId: keyword.id,
            accountId: post.accountId,
            platformPostId: post.platformPostId ?? post.id,
            authorUsername: post.account.platformUsername,
            postText: text,
            postUrl: post.platformUrl
          }
        });
        newMatches += 1;
      } catch {}
    }
  }

  return {
    scannedAccounts: posts.length,
    newMatches
  };
}
