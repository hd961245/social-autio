function formatConnectError(input: {
  error?: string;
  error_code?: string;
  error_reason?: string;
  error_description?: string;
  message?: string;
}) {
  if (input.error === "invalid_oauth_state") {
    return "OAuth state 驗證失敗。這通常代表授權流程中 cookie 沒帶回來，或你中途重整 / 開了另一個授權分頁。";
  }

  if (input.error === "threads_oauth_error") {
    return [
      "Threads / Meta 直接把授權擋回來了。",
      input.error_code ? `error=${input.error_code}` : null,
      input.error_reason ? `reason=${input.error_reason}` : null,
      input.error_description ? `description=${input.error_description}` : null
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (input.error === "threads_callback_failed") {
    return input.message || "Threads callback 失敗，請到 Ops 看最近的 callback log。";
  }

  return null;
}

export default async function ConnectAccountPage({
  searchParams
}: {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_reason?: string;
    error_description?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const connectError = formatConnectError(params);

  return (
    <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">OAuth</p>
      <h1 className="mt-2 text-3xl font-semibold">連接 Threads 帳號</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
        目前先把 OAuth URL、callback route 與資料存放介面備好。填入 Threads app env 後即可接真實授權。
      </p>

      {connectError ? (
        <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-900">
          {connectError}
        </div>
      ) : null}

      <div className="mt-8 rounded-3xl bg-white/80 p-5">
        <p className="text-sm text-[var(--muted)]">OAuth Start</p>
        <a
          href="/api/threads/authorize"
          className="mt-3 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
        >
          前往 Threads 授權
        </a>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          如果你被 Threads / Meta 擋回來，這頁現在會直接顯示 `error / reason / description`，方便判斷是 scope、redirect URI、tester 權限，還是 OAuth state 問題。
        </p>
      </div>
    </section>
  );
}
