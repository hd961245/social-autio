# Social Audio

Threads-first 自媒體創業者管理中台。

## Current Status

- PRD: [docs/PRD.md](./docs/PRD.md)
- Next-Stage Roadmap: [docs/ROADMAP.md](./docs/ROADMAP.md)
- Bootstrap Guide: [docs/BOOTSTRAP.md](./docs/BOOTSTRAP.md)
- Current State: [docs/STATE.md](./docs/STATE.md)
- Product Map (ZH): [docs/PRODUCT_MAP_ZH.md](./docs/PRODUCT_MAP_ZH.md)
- Handoff Notes: [docs/HANDOFF.md](./docs/HANDOFF.md)
- Persistence + Automation: [docs/PERSISTENCE_AND_AUTOMATION.md](./docs/PERSISTENCE_AND_AUTOMATION.md)
- Deploy / Recovery: [docs/ZEABUR.md](./docs/ZEABUR.md)
- Workflow SOP: [docs/WORKFLOW.md](./docs/WORKFLOW.md)
- User Workflow Spec: [docs/USER_WORKFLOW_SPEC.md](./docs/USER_WORKFLOW_SPEC.md)
- Knowledge Ingestion Plan: [docs/KNOWLEDGE_INGESTION.md](./docs/KNOWLEDGE_INGESTION.md)
- Current focus: Threads publishing + WordPress draft studio + Content Desk + Content Inventory
- Stack: Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Inngest

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
- 若要使用 AI 草稿引擎，可設定 `OPENAI_API_KEY`、`GEMINI_API_KEY` 或 `ANTHROPIC_API_KEY`
- 若你有自己的 OpenAI 相容 AI API，可另外設定 `OPENAI_BASE_URL` 與 `OPENAI_MODEL`
- 若你只想走 Gemini，可設定 `GEMINI_API_KEY` 與 `GEMINI_MODEL`，預設會用 `gemini-2.5-flash-lite`
- AI provider 可在內容引擎中選擇 `Auto / Gemini / Claude / OpenAI`
- 若要使用 Threads 排程前 Telegram 確認，另外設定 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`、`APP_BASE_URL`
- 若要在 `Analytics` 看網站流量總覽，另外設定 `GA4_PROPERTY_ID`、`GA4_CLIENT_EMAIL`、`GA4_PRIVATE_KEY`
- `GA4_CLIENT_EMAIL` / `GA4_PRIVATE_KEY` 來自 Google Cloud service account，並且該帳號需要加入 GA4 property 權限
- 若要讓排程、metrics、keywords 與 automation 自動執行，另外設定 `INNGEST_EVENT_KEY`、`INNGEST_SIGNING_KEY`、`INNGEST_SERVE_ORIGIN`
- `THREADS_REDIRECT_URI` 應設為 `https://social-audio.zeabur.app/api/threads/callback`
- 首次部署後執行一次 `npm run db:push`

如果你遇到「之前串好的 WordPress / Threads 帳號突然不見」，先看 [docs/ZEABUR.md](./docs/ZEABUR.md) 的 recovery checklist。

## Inngest Jobs

排程貼文不是只存進資料庫就會自己發，現在改由 Inngest 負責每分鐘觸發 scheduler function。

需要在 Inngest 將 app 連到：

`https://social-audio.zeabur.app/api/inngest`

目前已內建的排程：

- 每 1 分鐘：發布到期排程貼文
- 每 6 小時：收集 metrics + 刷新即將到期 token
- 每 30 分鐘：關鍵字掃描
- 每 30 分鐘：自動化規則執行
- 每 15 分鐘：檢查各 Threads persona 是否到了每日自動生文時間
- 每 3 小時：刷新 Source Watchlist 最新內容
- 每天 08:00（UTC+8）：把開啟 daily auto-import 的來源自動送進站內草稿池

## Current Product Shape

- `Threads`：即時發文、排程、Queue、分析
- `Threads Personas`：每個 Threads 帳號可維護不同人設與預設語氣
- `Persona Playbook`：每個 Threads 帳號可定義題材範圍、hook 風格、CTA 風格與語氣禁區
- `Daily AI Autopilot`：每個 Threads 帳號可設定每日自動生文時間、方向與草稿 / 排程模式
- `WordPress`：只建立 / 更新草稿，不直接發佈
- `Content Engine`：輸入 URL / text / image，產出 Threads + WordPress draft
- `Content Desk`：把 Inbox / Sources / Engine / Queue 收在同一個工作台
- `Content Inventory`：用 source / draft / published / expandable / monetizable 看內容階段
- `Writing Style Memory`：從你自己的 WordPress 舊文學風格與聯盟連結規劃
- `WordPress Draft Memory`：判斷每篇草稿更像新稿、待補長文、後台待細修或已積壓
- `Source Watchlist`：追蹤 RSS / Blog 來源
- `Inbox`：集中處理最新來源內容並做簡單改寫判斷

## Product Direction

這個專案正在從「個人內容工具」往「自媒體創業者管理中台」演進。

下一階段的核心不是多做幾個平台，而是把這幾層收成一個可運作的內容生意後台：

- 內容來源與選題
- Threads 發布與復盤
- WordPress 長文草稿工作流
- 聯盟連結 / CTA / 推廣模組
- 自己的寫作風格與內容資產複用

建議上線前重設 `THREADS_APP_SECRET`，並把 `ADMIN_SESSION_SECRET` 與 `TOKEN_ENCRYPTION_KEY` 換成高熵隨機值。
