import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: "seed-admin" },
    update: {},
    create: {
      id: "seed-admin",
      name: "Admin"
    }
  });

  const account = await prisma.platformAccount.upsert({
    where: {
      platform_platformUserId: {
        platform: "threads",
        platformUserId: "demo-threads-user"
      }
    },
    update: {},
    create: {
      userId: user.id,
      platform: "threads",
      platformUserId: "demo-threads-user",
      platformUsername: "demo_threads",
      profilePictureUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      accessToken: "encrypted-demo-token",
      tokenType: "long_lived",
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45)
    }
  });

  await prisma.metricsSnapshot.create({
    data: {
      accountId: account.id,
      followerCount: 1840,
      totalViews: 23200,
      totalLikes: 1690,
      totalReplies: 143,
      totalReposts: 62,
      totalQuotes: 19
    }
  });

  const keyword = await prisma.keyword.create({
    data: {
      userId: user.id,
      keyword: "social audio",
      matchMode: "contains"
    }
  });

  await prisma.keywordMatch.create({
    data: {
      keywordId: keyword.id,
      accountId: account.id,
      platformPostId: "reply-1",
      authorUsername: "trend_watcher",
      postText: "這個 social audio 類型最近很多人在討論",
      actionTaken: "replied"
    }
  });

  await prisma.autoRule.create({
    data: {
      userId: user.id,
      name: "Keyword reply starter",
      triggerType: "keyword_match",
      triggerConfig: JSON.stringify({ keywordIds: [keyword.id] }),
      actionType: "reply",
      actionConfig: JSON.stringify({ mode: "template" })
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

