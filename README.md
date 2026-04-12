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
- 若要讓排程自動發文，另外設定 `CRON_SECRET`
- `THREADS_REDIRECT_URI` 應設為 `https://social-audio.zeabur.app/api/threads/callback`
- 首次部署後執行一次 `npm run db:push`

## Scheduler

排程貼文不是只存進資料庫就會自己發，還需要一個定時器去呼叫：

`GET /api/cron/scheduler?secret=你的-CRON_SECRET`

在 Zeabur 建議新增一個每 1 分鐘執行一次的 Scheduled Request，指向上面的 URL。

建議上線前重設 `THREADS_APP_SECRET`，並把 `ADMIN_SESSION_SECRET` 與 `TOKEN_ENCRYPTION_KEY` 換成高熵隨機值。
