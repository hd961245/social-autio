# Social Audio — 產品需求文件 (PRD)

> **版本**：v1.0
> **建立日期**：2026-04-06
> **狀態**：Draft
> **GitHub**：https://github.com/hd961245/social-autio

---

## 1. 產品概述

### 1.1 產品定位

**Social Audio** 是一個社群自動經營管理平台（口碑/水軍管理工具），讓使用者可以透過統一後台管理多個社群帳號，實現自動化發文、帳號健康監控、關鍵字監測與智慧回應。

### 1.2 願景

- **短期**：以 **Meta Threads** 為核心平台，建立完整的帳號管理與自動化發文能力
- **長期**：擴展至 Instagram、Twitter/X、部落格等平台，支援短文、影片、圖片等多種素材格式

### 1.3 核心價值

| 價值 | 說明 |
|------|------|
| 批量管理 | 在一個 Dashboard 管理 1-5 個（初期）社群帳號 |
| 自動化 | 排程發文、自動回覆、規則化互動，減少人工操作 |
| 數據驅動 | 即時監控帳號健康度，追蹤曝光/互動/追蹤者趨勢 |
| 智慧回應 | 結合預設模板與 AI（Claude API），產生自然語言回覆 |
| 可擴展 | 平台抽象架構，新增平台無需重寫核心邏輯 |

---

## 2. 目標使用者

| 角色 | 需求 |
|------|------|
| 行銷人員 | 管理品牌社群帳號，追蹤成效指標 |
| 品牌操盤手 | 批量管理多個品牌/子品牌帳號，統一排程發文 |
| 社群代操團隊 | 管理客戶帳號，監控帳號健康度，自動化日常互動 |
| 口碑經營者 | 透過多帳號進行話題引導、關鍵字回應、互動養號 |

---

## 3. 核心功能規格

### F1: 多帳號管理

**優先級**：P0（MVP 必備）

| 項目 | 規格 |
|------|------|
| 連接方式 | Meta Threads OAuth 2.0 授權 |
| 帳號數量 | 初期 1-5 個，架構支援擴展 |
| 資訊顯示 | 帳號名稱、頭貼、平台、Token 狀態、最後同步時間 |
| Token 管理 | 自動刷新即將到期的長期 Token（60天效期，提前7天刷新） |
| 操作 | 連接新帳號 / 斷開連接 / 重新授權 |

**OAuth 權限範圍**：
- `threads_basic` — 讀取個人資料與已發布的貼文
- `threads_content_publish` — 發布文字、圖片、影片、輪播貼文
- `threads_manage_replies` — 管理回覆
- `threads_read_replies` — 讀取回覆（關鍵字監控用）
- `threads_manage_insights` — 讀取帳號與貼文層級指標

**OAuth 流程**：
```
使用者點擊「連接 Threads 帳號」
  → 導向 https://threads.net/oauth/authorize?client_id=...&scope=...&response_type=code
  → 使用者在 Threads 授權
  → 回調 /api/threads/callback?code=XXXXX
  → 伺服器交換短期 Token（1 小時效期）
  → 伺服器交換長期 Token（60 天效期）
  → 取得使用者資訊（id, username, profile_picture_url）
  → 儲存至資料庫 PlatformAccount 表
  → 導回 Dashboard 帳號列表，顯示成功訊息
```

---

### F2: 內容發布

**優先級**：P0（MVP 必備）

#### F2.1 立即發文

| 項目 | 規格 |
|------|------|
| 內容類型 | 文字 / 圖片 / 影片 / 輪播（Carousel） |
| 文字限制 | 最多 500 字元 |
| 主題標籤 | 最多 1 個（Threads 限制） |
| 輪播限制 | 2-20 張圖片或影片 |
| 帳號選擇 | 下拉選單選擇要發布的帳號（可多選批量發送） |
| 媒體輸入 | 提供圖片/影片 URL（Threads API 接收 URL 而非檔案上傳） |

**發布流程（Threads API 兩步驟）**：
```
Step 1: POST /{user_id}/threads
        body: { text, media_type, image_url/video_url }
        → 取得 media_container_id

Step 2: 等待 30 秒（或輪詢容器狀態至 FINISHED）

Step 3: POST /{user_id}/threads_publish
        body: { creation_id: media_container_id }
        → 取得 published_post_id
```

#### F2.2 排程發文

| 項目 | 規格 |
|------|------|
| 排程方式 | 選擇日期+時間，精確到分鐘 |
| 佇列狀態 | 草稿 / 排程中 / 發布中 / 已發布 / 失敗 |
| 佇列管理 | 編輯、刪除、重試失敗的貼文 |
| 執行頻率 | Cron job 每 1 分鐘掃描到期的排程貼文 |
| 配額追蹤 | 顯示當日已用 / 剩餘發文配額（上限 250 posts/day） |

#### F2.3 未來擴展（非 MVP）

- 批量 CSV 匯入排程
- AI 內容生成（給定主題自動產生貼文）
- 多平台同步發布

---

### F3: 帳號健康監控

**優先級**：P1

#### F3.1 帳號層級指標

| 指標 | 說明 | 資料來源 |
|------|------|----------|
| 追蹤者數 | 帳號追蹤者總數 + 歷史趨勢 | `GET /{user_id}/threads_insights?metric=followers_count` |
| 總曝光 | 貼文被瀏覽的總次數 | `metric=views` |
| 總按讚 | 所有貼文獲得的按讚數 | `metric=likes` |
| 總回覆 | 收到的回覆總數 | `metric=replies` |
| 總轉發 | 被轉發的總次數 | `metric=reposts` |
| 總引用 | 被引用的總次數 | `metric=quotes` |
| 人口統計 | 追蹤者的國家/城市/年齡/性別分佈 | `metric=follower_demographics`（需 100+ 追蹤者） |

#### F3.2 貼文層級指標

| 指標 | 說明 |
|------|------|
| 曝光 (Views) | 單篇貼文被瀏覽次數 |
| 按讚 (Likes) | 單篇貼文按讚數 |
| 回覆 (Replies) | 單篇貼文回覆數 |
| 轉發 (Reposts) | 單篇貼文轉發數 |
| 引用 (Quotes) | 單篇貼文引用數 |
| 分享 (Shares) | 單篇貼文分享數 |

#### F3.3 Dashboard 圖表

| 圖表 | 類型 | 說明 |
|------|------|------|
| 追蹤者趨勢 | 折線圖 | 近 7/30/90 天追蹤者數量變化 |
| 互動分佈 | 堆疊面積圖 | 按讚/回覆/轉發/引用的每日分佈 |
| Top 貼文 | 表格 | 依互動率排序的最佳表現貼文 |
| 人口統計 | 圓餅圖 | 追蹤者國家/年齡/性別分佈 |
| 帳號健康卡片 | 數字卡片 | 追蹤者數(+delta)、7日曝光、互動率 |

#### F3.4 指標收集排程

| 項目 | 規格 |
|------|------|
| 頻率 | 每 6 小時自動收集 |
| 範圍 | 所有活躍帳號的帳號層級指標 + 近 7 天貼文的貼文層級指標 |
| 儲存 | 每次收集存為一筆 MetricsSnapshot / PostMetrics 紀錄 |
| API 配額 | 4800 × (過去24小時曝光數) calls/day，5 個帳號每 6 小時約 20-40 calls，遠低於上限 |

#### F3.5 Token 健康監控

| 項目 | 規格 |
|------|------|
| 到期提醒 | Token 距到期 ≤ 7 天時，Dashboard 顯示警告橫幅 |
| 自動刷新 | 每日 Cron job 自動刷新即將到期的 Token（延長至 90 天） |
| 失敗處理 | 刷新失敗時標記帳號為「需要重新授權」，通知使用者 |

---

### F4: 關鍵字監控

**優先級**：P2

#### F4.1 關鍵字管理

| 項目 | 規格 |
|------|------|
| 新增/編輯/刪除 | CRUD 管理介面 |
| 比對模式 | 包含 (contains) / 完全符合 (exact) / 正則表達式 (regex) |
| 啟用/停用 | 每個關鍵字可獨立啟停 |

#### F4.2 監控策略

**MVP 方案（API 合規）**：掃描自有帳號貼文的回覆樹

```
對每個活躍帳號：
  1. GET /{user_id}/threads → 取得最近的貼文列表
  2. 對每篇貼文：GET /{media_id}/replies → 取得回覆
  3. 對每則回覆的文字內容，比對所有活躍關鍵字
  4. 命中 → 建立 KeywordMatch 紀錄（去重：同關鍵字+同貼文不重複記錄）
```

| 項目 | 規格 |
|------|------|
| 掃描頻率 | 每 30 分鐘 |
| 掃描範圍 | 自有帳號最近的貼文及其回覆樹 |
| 去重機制 | 以 `keywordId + platformPostId` 為唯一鍵 |

#### F4.3 命中列表

| 欄位 | 說明 |
|------|------|
| 命中關鍵字 | 觸發的關鍵字 |
| 來源貼文 | 回覆的內容文字 |
| 作者 | 回覆者的使用者名稱 |
| 時間 | 回覆時間 |
| 已採取動作 | replied / liked / reposted / 無 |
| 快速動作按鈕 | 回覆 / 按讚 / 轉發（點擊後立即執行） |

#### F4.4 已知限制

| 限制 | 說明 |
|------|------|
| 無全域搜尋 | Threads API 不提供搜尋端點，無法搜尋任意關鍵字 |
| 僅限回覆樹 | 只能監控自有帳號貼文底下的回覆 |
| 未來擴展 | 架構預留 `ContentSource` 介面，日後可接入第三方社群監聽服務或 Web Scraping |

---

### F5: 自動回覆 / 互動規則

**優先級**：P2

#### F5.1 規則引擎

| 項目 | 規格 |
|------|------|
| 觸發條件 | 關鍵字命中 / 收到提及 / 收到回覆 / 新追蹤者 |
| 執行動作 | 回覆 / 按讚 / 轉發 / 引用 |
| 回覆帳號 | 指定使用哪個帳號執行動作 |
| 啟用/停用 | 每條規則可獨立啟停 |

#### F5.2 回覆內容生成

**模式 A：預設模板**

| 項目 | 規格 |
|------|------|
| 模板數量 | 每條規則可設定多組模板 |
| 變數支援 | `{author}` — 原作者名稱、`{keyword}` — 命中關鍵字、`{post_text}` — 原文摘錄 |
| 選擇方式 | 系統隨機挑選一組模板，填入變數後發送 |

**模式 B：AI 生成（Claude API）**

| 項目 | 規格 |
|------|------|
| AI 引擎 | Claude API（@anthropic-ai/sdk） |
| 輸入 | 原始貼文內容 + 使用者設定的語氣/角色指令 |
| 輸出 | 自然語言回覆（控制在 500 字元內） |
| 可設定項 | 語氣（友善/專業/幽默）、角色扮演（品牌客服/一般網友/KOL）、回覆長度 |
| 需求 | 使用者需提供 `ANTHROPIC_API_KEY` |

#### F5.3 安全機制

| 機制 | 規格 |
|------|------|
| 每日上限 | 每條規則可設定每日最大執行次數（預設 50） |
| 隨機延遲 | 觸發後等待 30-300 秒再執行（可調整，模擬真人行為） |
| 重複偵測 | 同一篇貼文不會被同一條規則重複執行 |
| 全域暫停 | 一鍵暫停所有自動化規則 |
| 活動日誌 | 記錄所有自動化動作，可查看/撤銷（刪除回覆） |

---

## 4. 技術架構

### 4.1 技術選型

| 層級 | 選擇 | 原因 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | 全端單一 repo，API Routes 當後端，SSR 加速 Dashboard |
| 語言 | TypeScript | 前後端型別安全 |
| 資料庫 | SQLite (開發) / PostgreSQL (正式) | 開發零配置，正式環境 Zeabur PostgreSQL addon |
| ORM | Prisma | 型別安全查詢、migration 系統、多資料庫切換 |
| UI 元件 | shadcn/ui + Tailwind CSS | 高品質 Dashboard 元件，快速開發 |
| 圖表 | Recharts | React 原生、適合時序資料視覺化 |
| 排程 | node-cron (MVP) → BullMQ + Redis (正式) | MVP 簡單，正式環境支援重試與並行 |
| 使用者驗證 | NextAuth.js v5 | 管理者帳號登入（email/密碼） |
| AI 回覆 | Claude API (@anthropic-ai/sdk) | 自然語言回覆生成 |
| 多語系 | next-intl | 繁體中文（zh-TW）+ 英文 |

### 4.2 專案結構

```
social-autio/
├── docs/
│   └── PRD.md                     # 本文件
├── prisma/
│   ├── schema.prisma              # 資料庫模型定義
│   ├── migrations/                # Migration 紀錄
│   └── seed.ts                    # 開發用種子資料
├── messages/
│   ├── zh-TW.json                 # 繁體中文翻譯
│   └── en.json                    # 英文翻譯
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout（providers）
│   │   ├── page.tsx               # Landing / 登入導向
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx     # 登入頁
│   │   │   └── register/page.tsx  # 註冊頁
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard 外框（側邊欄+頂部列）
│   │   │   ├── page.tsx           # 總覽儀表板
│   │   │   ├── accounts/
│   │   │   │   ├── page.tsx       # 帳號列表
│   │   │   │   └── connect/page.tsx # OAuth 發起頁
│   │   │   ├── compose/
│   │   │   │   └── page.tsx       # 發文編輯器
│   │   │   ├── posts/
│   │   │   │   └── page.tsx       # 排程佇列管理
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx       # 數據分析圖表
│   │   │   ├── keywords/
│   │   │   │   └── page.tsx       # 關鍵字監控
│   │   │   └── automation/
│   │   │       └── page.tsx       # 自動化規則
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth 處理
│   │       ├── threads/
│   │       │   ├── callback/route.ts   # OAuth 回調
│   │       │   ├── publish/route.ts    # 觸發發文
│   │       │   └── insights/route.ts   # 指標查詢
│   │       └── cron/
│   │           ├── scheduler/route.ts  # 排程發文處理
│   │           ├── metrics/route.ts    # 指標收集
│   │           └── keywords/route.ts   # 關鍵字掃描
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── platforms/
│   │   │   ├── types.ts           # 平台抽象介面（PlatformAdapter）
│   │   │   ├── index.ts           # 平台 registry/factory
│   │   │   └── threads/
│   │   │       ├── client.ts      # Threads API HTTP 客戶端
│   │   │       ├── oauth.ts       # OAuth 授權流程
│   │   │       ├── publisher.ts   # 發文邏輯（容器→發布）
│   │   │       ├── insights.ts    # 指標抓取
│   │   │       └── tokens.ts      # Token 刷新邏輯
│   │   ├── scheduler/
│   │   │   └── engine.ts          # 排程處理引擎
│   │   ├── keywords/
│   │   │   └── monitor.ts         # 關鍵字比對引擎
│   │   └── automation/
│   │       └── rules-engine.ts    # 規則評估 + 動作執行
│   ├── components/
│   │   ├── ui/                    # shadcn/ui 元件
│   │   └── dashboard/
│   │       ├── sidebar.tsx        # 側邊導航欄
│   │       ├── account-card.tsx   # 帳號資訊卡片
│   │       ├── post-composer.tsx  # 發文編輯器元件
│   │       ├── metrics-chart.tsx  # 指標圖表元件
│   │       └── keyword-table.tsx  # 關鍵字命中表格
│   └── hooks/
│       ├── use-accounts.ts        # 帳號資料 hook
│       └── use-metrics.ts         # 指標資料 hook
├── scripts/
│   └── setup-cron.ts              # 獨立 cron 執行器
├── .env.example                   # 環境變數範本
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### 4.3 多平台擴展架構

核心抽象為 `PlatformAdapter` 介面，所有平台整合皆實作此介面：

```typescript
interface PlatformAdapter {
  // 識別
  platformId: string;              // "threads" | "instagram" | "twitter" | ...
  displayName: string;             // "Threads" | "Instagram" | ...

  // OAuth
  getAuthorizationUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<TokenResult>;
  refreshToken(account: PlatformAccount): Promise<TokenResult>;

  // 發布
  createPost(account: PlatformAccount, content: PostContent): Promise<PublishResult>;
  deletePost(account: PlatformAccount, platformPostId: string): Promise<void>;

  // 互動
  replyToPost(account: PlatformAccount, targetPostId: string, text: string): Promise<PublishResult>;
  likePost?(account: PlatformAccount, targetPostId: string): Promise<void>;
  repostPost?(account: PlatformAccount, targetPostId: string): Promise<void>;

  // 指標
  getUserMetrics(account: PlatformAccount, since: Date, until: Date): Promise<UserMetrics>;
  getPostMetrics(account: PlatformAccount, platformPostId: string): Promise<PostMetricsData>;

  // 內容探索（關鍵字監控用）
  getOwnPosts(account: PlatformAccount, since: Date): Promise<PlatformPost[]>;
  getPostReplies(account: PlatformAccount, platformPostId: string): Promise<PlatformPost[]>;

  // 配額
  getPublishingQuota(account: PlatformAccount): Promise<QuotaInfo>;

  // 平台限制
  constraints: PlatformConstraints;
}

interface PlatformConstraints {
  maxTextLength: number;           // Threads: 500
  maxMediaItems: number;           // Threads: 20 (carousel)
  supportedMediaTypes: ("text" | "image" | "video" | "carousel")[];
  maxHashtags: number;             // Threads: 1
  publishDelaySeconds: number;     // Threads: 30
}
```

**新增平台** = 實作 `PlatformAdapter` 介面。Dashboard、排程、監控、自動化的程式碼全部透過介面運作，無需修改。

---

## 5. 資料模型

### 5.1 ER Diagram（概念）

```
User 1──N PlatformAccount 1──N Post 1──N PostMetrics
  │                        │
  │                        └──N MetricsSnapshot
  │
  ├──N Keyword 1──N KeywordMatch
  │
  └──N AutoRule
```

### 5.2 Table 定義

#### User（平台管理者）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String (cuid) | 主鍵 |
| email | String (unique) | 登入信箱 |
| name | String? | 顯示名稱 |
| passwordHash | String? | 密碼雜湊 |
| createdAt | DateTime | 建立時間 |
| updatedAt | DateTime | 更新時間 |

#### PlatformAccount（已連接社群帳號）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String (cuid) | 主鍵 |
| userId | String (FK→User) | 所屬管理者 |
| platform | String | 平台標識（`"threads"` / `"instagram"` / ...） |
| platformUserId | String | 平台上的使用者 ID |
| platformUsername | String | 平台上的使用者名稱 |
| profilePictureUrl | String? | 頭貼 URL |
| accessToken | String | OAuth Token（加密儲存） |
| tokenType | String | `"short_lived"` / `"long_lived"` |
| tokenExpiresAt | DateTime | Token 到期時間 |
| refreshToken | String? | 刷新用 Token |
| isActive | Boolean | 是否啟用 |
| lastSyncedAt | DateTime? | 最後同步時間 |
| createdAt / updatedAt | DateTime | 時間戳記 |

**唯一約束**：`(platform, platformUserId)` — 同一平台帳號不可重複連接

#### Post（發文）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String (cuid) | 主鍵 |
| userId | String (FK→User) | 建立者 |
| accountId | String (FK→PlatformAccount) | 發布帳號 |
| contentType | String | `"text"` / `"image"` / `"video"` / `"carousel"` |
| textContent | String? | 貼文文字（≤ 500 字元） |
| mediaUrls | String? | JSON 陣列：媒體 URL 列表 |
| topicTag | String? | 主題標籤（Threads 限 1 個） |
| status | String | `"draft"` / `"scheduled"` / `"publishing"` / `"published"` / `"failed"` |
| scheduledAt | DateTime? | 排程發布時間 |
| publishedAt | DateTime? | 實際發布時間 |
| errorMessage | String? | 失敗原因 |
| platformPostId | String? | 平台上的貼文 ID |
| platformUrl | String? | 貼文連結 |
| replyToPostId | String? | 回覆目標貼文的平台 ID |
| isAutoGenerated | Boolean | 是否由自動化規則產生 |
| createdAt / updatedAt | DateTime | 時間戳記 |

#### PostMetrics（貼文指標快照）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String (cuid) | 主鍵 |
| postId | String (FK→Post) | 所屬貼文 |
| views | Int | 曝光次數 |
| likes | Int | 按讚數 |
| replies | Int | 回覆數 |
| reposts | Int | 轉發數 |
| quotes | Int | 引用數 |
| shares | Int | 分享數 |
| capturedAt | DateTime | 快照時間 |

#### MetricsSnapshot（帳號指標快照）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String (cuid) | 主鍵 |
| accountId | String (FK→PlatformAccount) | 所屬帳號 |
| followerCount | Int | 追蹤者數 |
| totalViews | Int | 總曝光 |
| totalLikes | Int | 總按讚 |
| totalReplies | Int | 總回覆 |
| totalReposts | Int | 總轉發 |
| totalQuotes | Int | 總引用 |
| countryData | String? | JSON：國家分佈 |
| cityData | String? | JSON：城市分佈 |
| ageData | String? | JSON：年齡分佈 |
| genderData | String? | JSON：性別分佈 |
| capturedAt | DateTime | 快照時間 |

#### Keyword（監控關鍵字）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String (cuid) | 主鍵 |
| userId | String (FK→User) | 所屬管理者 |
| keyword | String | 關鍵字/詞組 |
| isActive | Boolean | 是否啟用 |
| matchMode | String | `"contains"` / `"exact"` / `"regex"` |
| createdAt / updatedAt | DateTime | 時間戳記 |

#### KeywordMatch（關鍵字命中紀錄）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String (cuid) | 主鍵 |
| keywordId | String (FK→Keyword) | 命中的關鍵字 |
| accountId | String? (FK→PlatformAccount) | 來源帳號 |
| platformPostId | String | 平台上的貼文 ID |
| authorUsername | String | 作者名稱 |
| authorId | String? | 作者平台 ID |
| postText | String | 命中的貼文內容 |
| postUrl | String? | 貼文連結 |
| matchedAt | DateTime | 命中時間 |
| actionTaken | String? | 已採取動作：`"replied"` / `"liked"` / `"reposted"` |
| actionPostId | String? | 我方回覆的貼文 ID |

**唯一約束**：`(keywordId, platformPostId)` — 防止重複命中

#### AutoRule（自動化規則）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | String (cuid) | 主鍵 |
| userId | String (FK→User) | 所屬管理者 |
| name | String | 規則名稱 |
| isActive | Boolean | 是否啟用 |
| triggerType | String | `"keyword_match"` / `"new_follower"` / `"mention"` / `"reply_received"` |
| triggerConfig | String | JSON：觸發條件設定 |
| actionType | String | `"reply"` / `"like"` / `"repost"` / `"quote"` |
| actionConfig | String | JSON：動作設定（模板、AI 設定、帳號選擇） |
| dailyLimit | Int | 每日最大執行次數（預設 50） |
| delayMinSeconds | Int | 最小延遲秒數（預設 30） |
| delayMaxSeconds | Int | 最大延遲秒數（預設 300） |
| executionCount | Int | 已執行次數 |
| lastExecutedAt | DateTime? | 最後執行時間 |
| createdAt / updatedAt | DateTime | 時間戳記 |

---

## 6. Threads API 整合細節

### 6.1 API Base URL

```
https://graph.threads.net/v1.0
```

### 6.2 核心端點

| 用途 | 方法 | 端點 |
|------|------|------|
| 取得使用者資訊 | GET | `/me?fields=id,username,threads_profile_picture_url` |
| 建立發文容器 | POST | `/{user_id}/threads` |
| 發布貼文 | POST | `/{user_id}/threads_publish` |
| 取得使用者貼文 | GET | `/{user_id}/threads?fields=id,text,timestamp,media_type` |
| 取得貼文回覆 | GET | `/{media_id}/replies?fields=id,text,username,timestamp` |
| 帳號層級指標 | GET | `/{user_id}/threads_insights?metric=views,likes,...` |
| 貼文層級指標 | GET | `/{media_id}/insights?metric=views,likes,...` |
| 發文配額 | GET | `/{user_id}/threads_publishing_limit` |
| Token 交換 | POST | `https://graph.threads.net/oauth/access_token` |
| Token 延長 | GET | `https://graph.threads.net/access_token?grant_type=th_exchange_token` |
| Token 刷新 | GET | `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token` |

### 6.3 Rate Limits

| 限制 | 數值 |
|------|------|
| 發文上限 | 250 posts / 24 小時 |
| API 呼叫上限 | 4800 × (過去 24hr 曝光數) calls / 24 小時 |
| 容器發布等待 | 建立容器後需等待 30 秒（或輪詢狀態至 FINISHED） |
| Carousel 項目 | 2-20 個媒體項目 |

### 6.4 Token 生命週期

```
授權碼 → 短期 Token（1 小時）→ 長期 Token（60 天）→ 刷新延長（90 天）
                                                         ↑
                                                    每日 Cron 自動刷新
```

---

## 7. 非功能需求

### 7.1 安全性

| 項目 | 措施 |
|------|------|
| Token 儲存 | AES-256-GCM 加密，金鑰來自環境變數 |
| CSRF 防護 | NextAuth 內建處理；Threads OAuth state 參數使用簽章 JWT |
| 輸入驗證 | 貼文內容前後端雙重驗證（長度、格式） |
| 環境變數 | `.env.local` 不進 Git，`.env.example` 提供範本 |

### 7.2 效能

| 項目 | 目標 |
|------|------|
| Dashboard 載入 | < 2 秒（SSR + 資料庫查詢） |
| 發文延遲 | < 35 秒（含 30 秒容器等待） |
| 排程精準度 | ±1 分鐘內發布 |

### 7.3 可用性

| 項目 | 措施 |
|------|------|
| 多語系 | 預設繁體中文（zh-TW），支援英文切換 |
| RWD | 桌面版優先，基本支援平板/手機 |
| 深色模式 | shadcn/ui 內建支援 |

### 7.4 可擴展性

| 項目 | 措施 |
|------|------|
| 多平台 | PlatformAdapter 介面抽象，新平台只需實作介面 |
| 帳號規模 | 初期 1-5 個，資料庫 index 設計支援 20+ 帳號 |
| 排程系統 | MVP 用 node-cron，可平滑遷移至 BullMQ + Redis |

---

## 8. 開發階段規劃

| Phase | 名稱 | 範圍 | 預估時程 |
|-------|------|------|----------|
| **1** | 帳號連接 + 基本發文 | 專案骨架、NextAuth 登入、Threads OAuth、Dashboard layout、帳號列表、發文編輯器、立即發文 | 1-2 週 |
| **2** | 數據儀表板 + 健康監控 | 指標收集 Cron、Recharts 圖表、帳號健康卡片、Token 到期監控 | 1 週 |
| **3** | 排程發文 + 佇列管理 | 排程選擇器、Cron 自動發布、佇列管理頁、Carousel 支援、配額追蹤 | 1 週 |
| **4** | 關鍵字監控 | 關鍵字 CRUD、回覆樹掃描 Cron、命中列表、快速動作按鈕 | 1 週 |
| **5** | 自動回覆 / 互動規則 | 規則建立 UI、模板回覆、Claude AI 回覆、安全機制、活動日誌 | 1-2 週 |

**MVP 範圍**：Phase 1 + Phase 2（帳號連接 + 發文 + 基本監控）

---

## 9. 部署方案

### 9.1 平台

**Zeabur**（https://zeabur.com）

### 9.2 架構

```
GitHub Repo (social-autio)
    │
    ├── push → Zeabur 自動部署
    │
    └── Zeabur Project
        ├── Next.js Service     ← 主應用程式
        ├── PostgreSQL Addon    ← 資料庫
        └── Redis Addon         ← 排程佇列（Phase 3+）
```

### 9.3 環境變數

```bash
# 資料庫
DATABASE_URL=postgresql://user:pass@host:5432/social_audio

# Threads OAuth
THREADS_APP_ID=your_threads_app_id
THREADS_APP_SECRET=your_threads_app_secret
THREADS_REDIRECT_URI=https://your-domain.zeabur.app/api/threads/callback

# NextAuth
NEXTAUTH_SECRET=random_32_char_secret_string
NEXTAUTH_URL=https://your-domain.zeabur.app

# AI 回覆（Phase 5）
ANTHROPIC_API_KEY=sk-ant-...

# Token 加密
TOKEN_ENCRYPTION_KEY=random_32_char_encryption_key

# Redis（Phase 3+）
REDIS_URL=redis://host:6379
```

### 9.4 Meta Developer Console 設定

1. 前往 https://developers.facebook.com/apps 登入
2. 建立 App → 選 **Business** 類型
3. 加入 **Threads API** 產品
4. 記下 `Threads App ID` 和 `Threads App Secret`
5. 設定 Redirect URI：
   - 開發：`https://localhost:3000/api/threads/callback`（需 HTTPS，用 `mkcert`）
   - 正式：`https://your-domain.zeabur.app/api/threads/callback`
6. App Roles → Threads Testers → 加入要連接的 Threads 帳號
7. 開發模式下測試者可直接使用所有權限；正式上線需提交 App Review

---

## 10. 排程任務總覽

| Job | 頻率 | Phase | 說明 |
|-----|------|-------|------|
| 排程發文處理 | 每 1 分鐘 | 3 | 發布到期的排程貼文 |
| 帳號指標收集 | 每 6 小時 | 2 | 帳號 + 貼文層級指標快照 |
| Token 自動刷新 | 每日 | 1 | 刷新 7 天內到期的長期 Token |
| 關鍵字掃描 | 每 30 分鐘 | 4 | 掃描自有帳號貼文回覆樹 |
| 自動化規則執行 | 每 30 分鐘 | 5 | 處理待執行的自動化動作 |

---

## 11. 已知限制與風險

| 風險 | 等級 | 說明 | 緩解措施 |
|------|------|------|----------|
| Threads API 無搜尋功能 | 高 | 無法搜尋全域關鍵字 | 先掃描自有帳號回覆樹；架構預留擴展 |
| 發文配額 250/天 | 中 | 多帳號共用配額需注意 | 前端顯示配額、排程分散發送 |
| Token 60 天到期 | 中 | 忘記刷新會斷線 | 自動刷新 Cron + 到期警告 |
| Meta App Review | 中 | 正式上線需通過審核 | 開發模式 + Testers 先行測試 |
| 帳號風控 | 高 | 大量自動化可能觸發平台偵測 | 隨機延遲、每日上限、人工介入機制 |
| AI 回覆品質 | 低 | AI 生成內容可能不適當 | 提供人工審核模式、回覆預覽 |

---

## 12. 成功指標

| 指標 | 目標 |
|------|------|
| 帳號連接成功率 | > 95% |
| 排程發文準時率 | > 99%（±1 分鐘內） |
| 指標收集完整率 | > 98%（每 6 小時無遺漏） |
| 關鍵字命中回應時間 | < 30 分鐘（掃描週期內） |
| Dashboard 載入速度 | < 2 秒 |

---

## 附錄 A: 未來功能藍圖

| 功能 | 優先級 | 說明 |
|------|--------|------|
| Instagram 整合 | P3 | 實作 InstagramAdapter |
| Twitter/X 整合 | P3 | 實作 TwitterAdapter |
| 部落格發布 | P4 | 支援 WordPress / Medium API |
| 短影片發布 | P4 | 支援 Reels / TikTok |
| 批量 CSV 匯入 | P3 | 匯入排程貼文 |
| AI 內容生成 | P3 | 根據主題自動產生貼文 |
| 多使用者/團隊 | P4 | 多個管理者共同管理 |
| Web Scraping 監控 | P3 | 擴展關鍵字監控至競品帳號 |
| Webhook 通知 | P3 | 關鍵字命中時推送 LINE/Slack 通知 |
| A/B 測試 | P4 | 同一內容不同版本的成效比較 |
