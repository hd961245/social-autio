export default function ConnectAccountPage() {
  return (
    <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">OAuth</p>
      <h1 className="mt-2 text-3xl font-semibold">連接 Threads 帳號</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
        目前先把 OAuth URL、callback route 與資料存放介面備好。填入 Threads app env 後即可接真實授權。
      </p>

      <div className="mt-8 rounded-3xl bg-white/80 p-5">
        <p className="text-sm text-[var(--muted)]">OAuth Start</p>
        <a
          href="/api/threads/authorize"
          className="mt-3 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
        >
          前往 Threads 授權
        </a>
      </div>
    </section>
  );
}
