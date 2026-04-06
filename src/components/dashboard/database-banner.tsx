import type { DatabaseStatus } from "@/lib/dashboard-data";

export function DatabaseBanner({ status }: { status: DatabaseStatus }) {
  if (status.ready) {
    return null;
  }

  return (
    <section className="rounded-[1.75rem] border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
      <p className="text-[11px] uppercase tracking-[0.28em] text-amber-700">Database Setup Needed</p>
      <p className="mt-2 font-medium">{status.message}</p>
      <p className="mt-2 text-amber-800/80">
        目前畫面會先以空狀態載入；跑完 `npm run db:push` 後，帳號、貼文和關鍵字資料就會正常顯示。
      </p>
    </section>
  );
}
