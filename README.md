# Social Audio

Social Audio 是一套給單人操盤手使用的多帳號 AI 自媒體營運系統，能把知識輸入、選題、產文、排程、發布、復盤與學習回填收成同一個內容飛輪。

一句話定義：

`單人操盤、多帳號、自動生成、自動排程、自動復盤的 AI 自媒體營運系統`

## Current Product Docs

- Product PRD v3: [docs/PRD_V3.md](./docs/PRD_V3.md)
- Product PRD v2: [docs/PRD_V2.md](./docs/PRD_V2.md)
- Requirements v2: [docs/REQUIREMENTS_V2.md](./docs/REQUIREMENTS_V2.md)
- Knowledge Ingestion Plan: [docs/KNOWLEDGE_INGESTION.md](./docs/KNOWLEDGE_INGESTION.md)

## Legacy References

- PRD (legacy): [docs/PRD.md](./docs/PRD.md)
- Workflow (legacy): [docs/WORKFLOW.md](./docs/WORKFLOW.md)
- Roadmap (legacy): [docs/ROADMAP.md](./docs/ROADMAP.md)
- User Workflow Spec (legacy support): [docs/USER_WORKFLOW_SPEC.md](./docs/USER_WORKFLOW_SPEC.md)
- Bootstrap Guide: [docs/BOOTSTRAP.md](./docs/BOOTSTRAP.md)
- Current State: [docs/STATE.md](./docs/STATE.md)
- Product Map (ZH): [docs/PRODUCT_MAP_ZH.md](./docs/PRODUCT_MAP_ZH.md)
- Handoff Notes: [docs/HANDOFF.md](./docs/HANDOFF.md)
- Persistence + Automation: [docs/PERSISTENCE_AND_AUTOMATION.md](./docs/PERSISTENCE_AND_AUTOMATION.md)
- Deploy / Recovery: [docs/ZEABUR.md](./docs/ZEABUR.md)
- Current focus: PM Ops + account operating lanes + high-autonomy Threads / WordPress factory
- Stack: Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Inngest

## Core Product Idea

這個產品的核心不是「幫你寫一篇文」，而是把一個人的內容營運流程變成可持續運轉的系統：

`知識輸入 -> 選題 -> 草稿 -> 審核 / 排程 -> 發布 -> 數據回收 -> 規則更新`

主要輸入包括：

- 帳號 mission、persona、tone、hook、CTA
- 外部來源：RSS、文章、網站、研究資料
- 個人知識：Obsidian 筆記、NotebookLM 摘要、舊貼文、長文、逐字稿
- 既有表現：Threads、WordPress、SEO、歷史有效規則

主要輸出包括：

- Threads 排程與發布
- WordPress 長文沉澱
- Review 例外處理
- Analytics / Learning 規則回填

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

## Knowledge Inputs

目前系統支援把 `NotebookLM` 與 `Obsidian` 內容作為知識輸入源，但採 `手動匯入`，不做 API 自動同步。

- `NotebookLM`
  - 預設偏 `Research Library`
  - 適合摘要、整理、案例、研究重點
- `Obsidian`
  - 可進 `Voice Corpus` 或 `Research Library`
  - 個人觀點與原始想法偏向 `Voice Corpus`
  - 拆解、研究筆記與資料偏向 `Research Library`

## Zeabur Deploy

- 建立 Zeabur `PostgreSQL` addon，將連線字串填到 `DATABASE_URL`
- 設定環境變數：`ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET`、`THREADS_APP_ID`、`THREADS_APP_SECRET`、`THREADS_REDIRECT_URI`、`TOKEN_ENCRYPTION_KEY`
- 若要使用 AI 草稿引擎，可設定 `OPENAI_API_KEY`、`GEMINI_API_KEY` 或 `ANTHROPIC_API_KEY`
- 若你有自己的 OpenAI 相容 AI API，可另外設定 `OPENAI_BASE_URL` 與 `OPENAI_MODEL`
- 若你只想走 Gemini，可設定 `GEMINI_API_KEY` 與 `GEMINI_MODEL`，預設會用 `gemini-2.5-flash-lite`
- AI provider 可在內容引擎中選擇 `Auto / Gemini / Claude / OpenAI`
- 若要使用 Threads 排程前 Telegram 確認，另外設定 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`、`APP_BASE_URL`
- 若要在 `Analytics` 看網站流量總覽，至少設定 `GA4_PROPERTY_ID`
- Google 流量讀取現在支援兩種方式：
  - `Google OAuth 使用者模式`：設定 `GOOGLE_OAUTH_CLIENT_ID`、`GOOGLE_OAUTH_CLIENT_SECRET`、`GOOGLE_OAUTH_REFRESH_TOKEN`
  - `service account 模式`：設定 `GA4_CLIENT_EMAIL`、`GA4_PRIVATE_KEY`
- 若要在 `Analytics` 看自然搜尋表現，另外設定 `GSC_SITE_URL`，必要時也可另外指定 `GSC_CLIENT_EMAIL`、`GSC_PRIVATE_KEY`
- 若要收到每日日報，優先可設定 `DISCORD_DAILY_WEBHOOK_URL`；也支援 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID` 作為備援。系統會在背景自動彙整過去 24 小時的 Threads / WordPress / SEO 自動營運結果
- 如果你是自己用，優先建議 `Google OAuth 使用者模式`；只要你自己的 Google 帳號本來就看得到 GA4 / Search Console，就不需要再額外處理 service account 權限
- 若 GSC 共用同一組 service account，可只補 `GSC_SITE_URL`
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
- 每天早上（透過每小時 background check 自動補跑）：送出 Telegram 每日日報

## Current Product Shape

- `Desk / PM Ops`：首頁總控台，集中看自動化是否真的有跑、哪些帳號卡住、今天最值得處理的下一步
- `Accounts`：每個帳號是一條獨立營運線，管理 persona、目標、節奏、token 與最近表現
- `Review`：只承接低信心、高風險、需 approval 或發送失敗的例外內容
- `Factory`：背景任務、內容流水線與失敗追蹤
- `Ops`：環境、排程、token、AI provider 與 auto-publish readiness 診斷
- `Threads`：即時發文、排程、Queue、分析
- `Threads Personas`：每個 Threads 帳號可維護不同人設與預設語氣
- `Persona Playbook`：每個 Threads 帳號可定義題材範圍、hook 風格、CTA 風格與語氣禁區
- `Daily AI Autopilot`：每個 Threads 帳號可設定每日自動生文時間、方向與草稿 / 排程模式
- `WordPress`：預設建立 / 更新草稿；也可切成站台級自動發布模式
- `Content Engine`：輸入 URL / text / image，產出 Threads + WordPress draft
- `Content Desk`：把 Inbox / Sources / Engine / Queue 收在同一個工作台
- `Content Inventory`：用 source / draft / published / expandable / monetizable 看內容階段
- `Writing Style Memory`：從你自己的 WordPress 舊文學風格與聯盟連結規劃
- `WordPress Draft Memory`：判斷每篇草稿更像新稿、待補長文、後台待細修或已積壓
- `Source Watchlist`：追蹤 RSS / Blog 來源
- `Inbox`：集中處理最新來源內容並做簡單改寫判斷

## Content Flywheel

系統內部的內容飛輪分成四層：

- `Voice Corpus`
  - 個人語料、風格、禁語、語氣與原始觀點
- `Research Library`
  - 研究素材、競品拆解、NotebookLM 摘要、可復用案例
- `Content Pipeline`
  - 題目池、brief、draft、image brief、publish job
- `Learning Loop`
  - performance signal、title / hook pattern、learning rule

這四層的目標是讓每次內容不是一次性產物，而是能反哺下一輪選題與生成。

## Product Direction

這個專案正在從「個人內容工具」往「單人操盤的 AI 自媒體營運系統」演進。

下一階段的核心不是多做幾個平台，而是把以下幾層收成一個真正可運作的內容後台：

- 知識輸入與知識沉澱
- Threads 發布與復盤
- WordPress 長文資產工作流
- 多帳號自動營運
- 自己的寫作風格與內容資產複用

建議上線前重設 `THREADS_APP_SECRET`，並把 `ADMIN_SESSION_SECRET` 與 `TOKEN_ENCRYPTION_KEY` 換成高熵隨機值。
