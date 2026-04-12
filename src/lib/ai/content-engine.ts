import { prisma } from "@/lib/prisma";
import { rewriteContentWithAi } from "@/lib/ai/gateway";

type IngestionInput = {
  sourceType: "url" | "text" | "image";
  sourceUrl?: string;
  title?: string;
  rawText?: string;
  imageUrls?: string[];
};

function stripText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function summarizeSource(title: string, rawText: string) {
  const base = stripText(`${title}\n${rawText}`);
  return base.slice(0, 1200);
}

function buildThreadsDraft(summary: string, personaPrompt: string, tone: string) {
  const intro = tone === "mystic-guide" ? "先說結論：" : "我看到一個很值得拆解的點：";
  const perspective = personaPrompt ? `\n視角：${personaPrompt.slice(0, 80)}` : "";
  const body = `${intro}\n\n${summary.slice(0, 340)}${perspective}\n\n如果把這件事拆成行動，大概有三步。`;
  return body.slice(0, 500);
}

function buildWordPressDraft(title: string, summary: string, personaPrompt: string) {
  const heading = title || "內容重寫草稿";
  const personaBlock = personaPrompt
    ? `<blockquote><strong>IP 人設視角：</strong>${personaPrompt}</blockquote>`
    : "";
  const paragraphs = summary
    .split(/(?<=[。！？.!?])\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((line) => `<p>${line}</p>`)
    .join("\n");

  return {
    title: heading,
    excerpt: summary.slice(0, 140),
    html: `
<p>這是一篇由 Content Engine 根據外部素材整理出的初稿，方便後續人工審閱與排程。</p>
${personaBlock}
${paragraphs}
<h2>可以再補強的地方</h2>
<ul>
  <li>補案例與數據</li>
  <li>加上個人觀點與立場</li>
  <li>補一段 CTA 或結論</li>
</ul>`.trim()
  };
}

export async function ingestAndGenerateDrafts(input: IngestionInput) {
  const user = await prisma.user.upsert({
    where: { id: "seed-admin" },
    update: {},
    create: {
      id: "seed-admin",
      name: "Admin"
    }
  });

  const settings = await prisma.appSettings.findFirst();
  const personaPrompt =
    settings?.globalPersonaPrompt?.trim() || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我拆解重點。";
  const tone = settings?.defaultTone?.trim() || "sharp-observer";

  const [threadsAccount, wordpressAccount] = await Promise.all([
    prisma.platformAccount.findFirst({
      where: { userId: user.id, platform: "threads", isActive: true },
      orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.platformAccount.findFirst({
      where: { userId: user.id, platform: "wordpress", isActive: true },
      orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
    })
  ]);

  if (!threadsAccount && !wordpressAccount) {
    throw new Error("至少需要先連接一個 Threads 或 WordPress 帳號，才能生成草稿。");
  }

  const safeTitle = input.title?.trim() || "未命名素材";
  const safeText = input.rawText?.trim() || input.sourceUrl || "沒有附上文字內容";
  const summary = summarizeSource(safeTitle, safeText);
  let aiProvider = "fallback";
  let generated = {
    summary,
    threadsDraft: buildThreadsDraft(summary, personaPrompt, tone),
    wordpressTitle: safeTitle,
    wordpressExcerpt: summary.slice(0, 140),
    wordpressHtml: buildWordPressDraft(safeTitle, summary, personaPrompt).html
  };

  try {
    const aiResult = await rewriteContentWithAi({
      title: safeTitle,
      rawText: safeText,
      personaPrompt,
      tone
    });

    aiProvider = aiResult.provider;
    generated = {
      summary: aiResult.summary,
      threadsDraft: aiResult.threadsDraft,
      wordpressTitle: aiResult.wordpressTitle,
      wordpressExcerpt: aiResult.wordpressExcerpt,
      wordpressHtml: aiResult.wordpressHtml
    };
  } catch {}

  const generatedPostIds: string[] = [];

  const ingestion = await prisma.ingestionRecord.create({
    data: {
      userId: user.id,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      title: safeTitle,
      rawText: safeText,
      imageUrls: input.imageUrls?.length ? JSON.stringify(input.imageUrls) : null,
      status: "processed",
      notes: `Persona: ${personaPrompt.slice(0, 120)} | Provider: ${aiProvider}`
    }
  });

  if (threadsAccount) {
    const threadsDraft = await prisma.post.create({
      data: {
        userId: user.id,
        accountId: threadsAccount.id,
        contentType: "text",
        textContent: generated.threadsDraft,
        mediaUrls: input.imageUrls?.length ? JSON.stringify(input.imageUrls.slice(0, 1)) : null,
        status: "draft"
      }
    });
    generatedPostIds.push(threadsDraft.id);
  }

  if (wordpressAccount) {
    const wordpressDraft = await prisma.post.create({
      data: {
        userId: user.id,
        accountId: wordpressAccount.id,
        contentType: "text",
        title: generated.wordpressTitle,
        textContent: generated.wordpressExcerpt,
        htmlContent: generated.wordpressHtml,
        excerpt: generated.wordpressExcerpt,
        featuredImageUrl: input.imageUrls?.[0] ?? null,
        status: "draft"
      }
    });
    generatedPostIds.push(wordpressDraft.id);
  }

  await prisma.ingestionRecord.update({
    where: { id: ingestion.id },
    data: {
      generatedPostIds: JSON.stringify(generatedPostIds)
    }
  });

  return {
    ingestionId: ingestion.id,
    generatedPostIds
  };
}
