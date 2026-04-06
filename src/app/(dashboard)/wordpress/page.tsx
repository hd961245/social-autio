import { PageIntro } from "@/components/dashboard/page-intro";
import { WordPressConnectForm } from "@/components/dashboard/wordpress-connect-form";

export const dynamic = "force-dynamic";

export default function WordPressPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="WordPress"
        title="部落格整合"
        description="使用 WordPress Application Password 連接站台，接著就可以在 Compose 直接發佈文章。"
      />
      <WordPressConnectForm />
    </div>
  );
}
