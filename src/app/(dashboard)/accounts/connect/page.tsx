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

  if (input.error === "threads_oauth_error" || input.error === "instagram_oauth_error") {
    const platform = input.error === "instagram_oauth_error" ? "Instagram / Meta" : "Threads / Meta";
    return [
      `${platform} 直接把授權擋回來了。`,
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

  if (input.error === "instagram_callback_failed") {
    return input.message || "Instagram callback 失敗，請到 Ops 看最近的 callback log。";
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
      <h1 className="mt-2 text-3xl font-semibold">連接社群帳號</h1>

      {connectError ? (
        <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-900">
          {connectError}
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        <div className="rounded-3xl bg-white/80 p-5">
          <p className="text-sm font-medium">Threads</p>
          <a
            href="/api/threads/authorize"
            className="mt-3 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
          >
            前往 Threads 授權
          </a>
          <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
            授權後會將 Threads 帳號加入系統，可開啟自動發文。
          </p>
        </div>

        <div className="rounded-3xl bg-white/80 p-5">
          <p className="text-sm font-medium">Instagram</p>
          <a
            href="/api/auth/instagram/authorize"
            className="mt-3 inline-flex rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 text-sm text-white"
          >
            前往 Instagram 授權
          </a>
          <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
            需要 Facebook 商業粉絲專頁已連接 Instagram Business / Creator 帳號。
          </p>
        </div>
      </div>
    </section>
  );
}
