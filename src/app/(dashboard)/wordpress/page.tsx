import { PageIntro } from "@/components/dashboard/page-intro";
import { AffiliateSlotLibraryCard } from "@/components/dashboard/affiliate-slot-library-card";
import { WordPressArchiveRewriteCard } from "@/components/dashboard/wordpress-archive-rewrite-card";
import { WordPressConnectForm } from "@/components/dashboard/wordpress-connect-form";
import { WordPressExpansionInbox } from "@/components/dashboard/wordpress-expansion-inbox";
import { WordPressStyleProfileCard } from "@/components/dashboard/wordpress-style-profile-card";
import { getWordPressExpansionCandidates } from "@/lib/dashboard-data";
import { getWordPressDraftStage } from "@/lib/content-inventory";
import { fetchWordPressPostById, fetchWordPressPosts } from "@/lib/platforms/wordpress/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WordPressPage() {
  let sites: Awaited<ReturnType<typeof prisma.platformAccount.findMany>> = [];
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  let localDrafts: Array<{
    id: string;
    title: string;
    excerpt: string;
    updatedAt: string;
    siteUrl: string;
    siteId: string;
    platformUrl: string | null;
    platformPostId: string | null;
    origin: "threads-sync" | "archive-rewrite" | "manual";
    memory: ReturnType<typeof getWordPressDraftStage>;
    remoteStatus: string | null;
    remoteModifiedAt: string | null;
  }> = [];
  let archivePosts: Array<{
    accountId: string;
    siteUrl: string;
    remotePostId: number;
    title: string;
    excerpt: string;
    status: string;
    publishedAt: string;
    link: string;
  }> = [];
  const expansionCandidates = await getWordPressExpansionCandidates();

  try {
    [sites, settings, localDrafts] = await Promise.all([
      prisma.platformAccount.findMany({
        where: {
          platform: "wordpress",
          isActive: true
        },
        orderBy: {
          updatedAt: "desc"
        }
      }),
      prisma.appSettings.findFirst(),
      prisma.post.findMany({
        where: {
          account: {
            platform: "wordpress"
          }
        },
        include: {
          account: true
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 8
      }).then((posts) =>
        posts.map((post) => ({
          id: post.id,
          title: post.title ?? post.textContent ?? "未命名草稿",
          excerpt: post.excerpt ?? post.textContent ?? "",
          updatedAt: post.updatedAt.toLocaleString("zh-TW", { hour12: false }),
          siteUrl: post.account.platformUserId,
          siteId: post.accountId,
          platformUrl: post.platformUrl,
          platformPostId: post.platformPostId,
          memory: getWordPressDraftStage(post),
          remoteStatus: null,
          remoteModifiedAt: null,
          origin: (post.replyToPostId ? "threads-sync" : post.title?.includes("重寫") ? "archive-rewrite" : "manual") as
            | "threads-sync"
            | "archive-rewrite"
            | "manual"
        }))
      )
    ]);

    const sitePosts = await Promise.all(
      sites.slice(0, 3).map(async (site) => {
        try {
          const posts = await fetchWordPressPosts(site.id, 6);
          return posts.map((post) => ({
            accountId: site.id,
            siteUrl: site.platformUserId,
            remotePostId: post.id,
            title: (post.title?.rendered ?? "").replace(/<[^>]+>/g, "").trim() || "未命名文章",
            excerpt: (post.excerpt?.rendered ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
            status: post.status ?? "unknown",
            publishedAt: post.date ? new Date(post.date).toLocaleDateString("zh-TW") : "未標記日期",
            link: post.link ?? site.platformUserId
          }));
        } catch {
          return [];
        }
      })
    );

    archivePosts = sitePosts.flat();

    localDrafts = await Promise.all(
      localDrafts.map(async (draft) => {
        if (!draft.platformPostId) {
          return draft;
        }

        try {
          const remotePost = await fetchWordPressPostById(draft.siteId, draft.platformPostId);

          return {
            ...draft,
            platformUrl: remotePost.link ?? draft.platformUrl,
            remoteStatus: remotePost.status ?? null,
            remoteModifiedAt: remotePost.modified
              ? new Date(remotePost.modified).toLocaleString("zh-TW", { hour12: false })
              : null
          };
        } catch {
          return draft;
        }
      })
    );
  } catch {}

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="WordPress"
        title="WordPress 草稿台"
        description="把 WordPress 當成長文編輯後台，而不是另一個要分心管理的平台。這裡最該先看的，是今天有哪些草稿值得處理。"
        action={
          sites[0] ? (
            <a href={`/compose?accountId=${sites[0].id}`} className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white">
              建立新的 WP 草稿
            </a>
          ) : undefined
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Connected Sites", value: String(sites.length), detail: sites.length > 0 ? "目前可接收草稿的站台數量" : "還沒有連接任何站台" },
          { label: "Draft Inbox", value: String(localDrafts.length), detail: localDrafts.length > 0 ? "最近可繼續編修的 WordPress 草稿" : "目前沒有本地草稿" },
          {
            label: "Expansion Inbox",
            value: String(expansionCandidates.length),
            detail: expansionCandidates.length > 0 ? "高表現 Threads 正等著擴寫成長文" : "目前沒有新的 Threads 擴寫待辦"
          },
          {
            label: "Style Memory",
            value: settings?.writingStyleProfile ? "Ready" : "Empty",
            detail: settings?.writingStyleProfile ? "生成草稿時會帶入你的舊文寫法" : "建議先分析舊文，讓生成結果更像你"
          },
        ].map((card) => (
          <article key={card.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Workflow</p>
          <h2 className="mt-2 text-3xl font-semibold">創作者每天最順的走法</h2>
          <div className="mt-5 space-y-3 text-sm">
            {[
              "1. 先看下方 Draft Inbox，挑今天要補完的長文草稿。",
              "2. 如果素材還不夠，去 Content Desk / Threads 把內容轉進來。",
              "3. 再回這裡用寫作風格與聯盟模組，把草稿補到可進站台細修的程度。",
              "4. 最後才看 Archive Rewrite，把舊文拆成新的題目來源。"
            ].map((step) => (
              <p key={step} className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-3 text-[var(--muted)]">
                {step}
              </p>
            ))}
          </div>
        </article>
        <article className="rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Quick Actions</p>
          <h2 className="mt-2 text-3xl font-semibold">今天先做哪一種</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/desk?tab=queue" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--card-dark)]">
              看 Queue 裡的 WP 草稿
            </a>
            <a href="/desk?tab=engine" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white">
              用 Engine 產新稿
            </a>
            {sites[0] ? (
              <a href={`/compose?accountId=${sites[0].id}`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white">
                直接開空白草稿
              </a>
            ) : null}
          </div>
          <div className="mt-5 space-y-2 text-sm text-white/74">
            <p>Threads 轉進來：適合快速把高互動短文沉成長文底稿。</p>
            <p>Engine 生成：適合從外部來源或 URL 先做出第一版。</p>
            <p>Archive Rewrite：適合把舊文變成新的題目，不適合當每天第一步。</p>
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Draft Inbox</p>
            <h2 className="mt-2 text-3xl font-semibold">今天可直接處理的草稿</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              這裡聚焦的是本地已存在的 WordPress 草稿，不管它是從 Threads sync、Archive Rewrite，還是你手動起稿進來的，都先從這裡接著修。
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          {localDrafts.map((draft) => (
            <article key={draft.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{draft.siteUrl}</p>
                    <span className="pill-tag">
                      {draft.origin === "threads-sync" ? "From Threads" : draft.origin === "archive-rewrite" ? "Archive Rewrite" : "Manual Draft"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs uppercase ${
                        draft.memory.status === "backend"
                          ? "bg-emerald-100 text-emerald-700"
                          : draft.memory.status === "extend"
                            ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                            : draft.memory.status === "stale"
                              ? "bg-stone-200 text-stone-700"
                              : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {draft.memory.statusLabel}
                    </span>
                    {draft.remoteStatus ? (
                      <span className="pill-tag">
                        後台 {draft.remoteStatus === "draft" ? "draft" : draft.remoteStatus === "future" ? "scheduled" : draft.remoteStatus}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold">{draft.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{draft.excerpt || "這篇草稿還沒有摘要，進去後可以先補前言與結論。"}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{draft.memory.detail}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">最後更新：{draft.updatedAt}</p>
                  {draft.remoteModifiedAt ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">後台最後變更：{draft.remoteModifiedAt}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <a href={`/compose?postId=${draft.id}`} className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white">
                    繼續編輯
                  </a>
                  {draft.platformUrl ? (
                    <a href={draft.platformUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                      打開後台草稿
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {localDrafts.length === 0 ? (
            <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              目前還沒有本地 WordPress 草稿。最順的開始方式是先從 Threads sync 一篇，或直接按右上角建立空白草稿。
            </article>
          ) : null}
        </div>
      </section>

      <WordPressExpansionInbox candidates={expansionCandidates} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <WordPressConnectForm />
        <div className="space-y-6">
          <WordPressStyleProfileCard
            sites={sites.map((site) => ({
              id: site.id,
              siteUrl: site.platformUserId,
              username: site.platformUsername
            }))}
            initialWritingStyleProfile={settings?.writingStyleProfile ?? ""}
            initialAffiliateLinkPolicy={settings?.affiliateLinkPolicy ?? ""}
          />
          <AffiliateSlotLibraryCard
            initialPrimary={settings?.affiliateBlockPrimary ?? ""}
            initialSecondary={settings?.affiliateBlockSecondary ?? ""}
            initialDisclosure={settings?.affiliateDisclosure ?? ""}
            initialCta={settings?.affiliateCta ?? ""}
          />
        </div>
      </section>

      <WordPressArchiveRewriteCard posts={archivePosts} />

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Connected Sites</p>
            <h2 className="mt-2 text-3xl font-semibold">已連接站台</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {sites.map((site) => (
            <article key={site.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
              <p className="text-sm text-[var(--muted)]">{site.platformUserId}</p>
              <h3 className="mt-2 text-xl font-semibold">@{site.platformUsername}</h3>
              <p className="mt-3 text-sm text-[var(--muted)]">
                最後同步：{site.lastSyncedAt?.toLocaleString("zh-TW", { hour12: false }) ?? "尚未同步"}
              </p>
            </article>
          ))}
          {sites.length === 0 ? (
            <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              目前還沒有 WordPress 站台，先在上方填入站址、使用者名稱和 Application Password。
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
