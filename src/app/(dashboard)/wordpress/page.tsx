import { PageIntro } from "@/components/dashboard/page-intro";
import { WordPressArchiveRewriteCard } from "@/components/dashboard/wordpress-archive-rewrite-card";
import { WordPressConnectForm } from "@/components/dashboard/wordpress-connect-form";
import { WordPressStyleProfileCard } from "@/components/dashboard/wordpress-style-profile-card";
import { fetchWordPressPosts } from "@/lib/platforms/wordpress/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WordPressPage() {
  let sites: Awaited<ReturnType<typeof prisma.platformAccount.findMany>> = [];
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
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

  try {
    [sites, settings] = await Promise.all([
      prisma.platformAccount.findMany({
        where: {
          platform: "wordpress",
          isActive: true
        },
        orderBy: {
          updatedAt: "desc"
        }
      }),
      prisma.appSettings.findFirst()
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
  } catch {}

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="WordPress"
        title="WordPress 草稿台"
        description="這裡只負責連接站台和接收草稿。Threads 轉進來的長文、或你在 Compose 手動建立的文章，都會以 draft 形式同步。"
      />
      <WordPressConnectForm />
      <WordPressStyleProfileCard
        sites={sites.map((site) => ({
          id: site.id,
          siteUrl: site.platformUserId,
          username: site.platformUsername
        }))}
        initialWritingStyleProfile={settings?.writingStyleProfile ?? ""}
        initialAffiliateLinkPolicy={settings?.affiliateLinkPolicy ?? ""}
      />
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
