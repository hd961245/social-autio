export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--card)] p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">Private Console</p>
          <h1 className="mt-4 text-5xl leading-tight font-semibold">
            Social Audio
            <span className="block text-[var(--accent)]">for Threads Operations</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">
            個人用社群自動經營後台。這一版先把 Threads 帳號、發文、健康監控和排程骨架跑起來。
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["1-5", "帳號管理"],
              ["250/day", "發文配額"],
              ["30s", "Threads 發布等待"]
            ].map(([value, label]) => (
              <div key={label} className="rounded-3xl bg-white/80 p-4">
                <p className="text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--card-strong)] p-8 shadow-[0_24px_100px_rgba(91,57,28,0.12)] lg:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Admin Login</p>
          <form action="/api/auth" method="post" className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]" htmlFor="password">
                管理密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full rounded-3xl border border-[var(--border)] bg-white/80 px-5 py-4 outline-none"
                placeholder="輸入 ADMIN_PASSWORD"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-3xl bg-[var(--accent)] px-5 py-4 text-base font-medium text-white"
            >
              進入 Dashboard
            </button>
          </form>

          <div className="mt-8 rounded-3xl bg-white/70 p-5 text-sm text-[var(--muted)]">
            <p>目前使用環境變數密碼驗證，後續可再補 PIN、雙層 session 與操作審計。</p>
          </div>
        </section>
      </div>
    </main>
  );
}

