# Social Audio

Threads-first 個人社群自動經營後台。

## Current Status

- PRD: [docs/PRD.md](./docs/PRD.md)
- MVP focus: Phase 1 + Phase 2
- Stack: Next.js App Router, TypeScript, Tailwind CSS, Prisma, SQLite

## Getting Started

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

預設登入密碼來自 `ADMIN_PASSWORD`。

## Zeabur Deploy

- 建立 Zeabur `PostgreSQL` addon，將連線字串填到 `DATABASE_URL`
- 設定環境變數：`ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET`、`THREADS_APP_ID`、`THREADS_APP_SECRET`、`THREADS_REDIRECT_URI`、`TOKEN_ENCRYPTION_KEY`
- 若要讓排程、metrics、keywords 與 automation 自動執行，另外設定 `INNGEST_EVENT_KEY`、`INNGEST_SIGNING_KEY`、`INNGEST_SERVE_ORIGIN`
- `THREADS_REDIRECT_URI` 應設為 `https://social-audio.zeabur.app/api/threads/callback`
- 首次部署後執行一次 `npm run db:push`

## Inngest Jobs

排程貼文不是只存進資料庫就會自己發，現在改由 Inngest 負責每分鐘觸發 scheduler function。

需要在 Inngest 將 app 連到：

`https://social-audio.zeabur.app/api/inngest`

目前已內建的排程：

- 每 1 分鐘：發布到期排程貼文
- 每 6 小時：收集 metrics + 刷新即將到期 token
- 每 30 分鐘：關鍵字掃描
- 每 30 分鐘：自動化規則執行

建議上線前重設 `THREADS_APP_SECRET`，並把 `ADMIN_SESSION_SECRET` 與 `TOKEN_ENCRYPTION_KEY` 換成高熵隨機值。
