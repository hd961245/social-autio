# Social Audio PRD v3

> Version: v3.0  
> Updated: 2026-05-10  
> Status: Active Product Definition  
> Repo: https://github.com/hd961245/social-autio

## 1. Product Overview

### 1.1 Product Positioning

`Social Audio` 是一套給單人操盤手使用的 `AI 自媒體營運系統`。

它的目標不是單次幫你寫一篇文，而是讓多個內容帳號可以持續自動運轉，形成：

`知識輸入 -> 選題 -> 草稿 -> 審核 / 排程 -> 發布 -> 數據回收 -> 規則更新`

### 1.2 One-line Definition

`單人操盤、多帳號、自動生成、自動排程、自動復盤的 AI 自媒體營運系統`

### 1.3 Core Value

系統要把以下輸入整合成一個可持續運轉的內容飛輪：

- 帳號設定：mission、persona、tone、hook、CTA、內容目標
- 外部來源：RSS、網站、文章、研究資料、官方訊號
- 個人知識：Obsidian 筆記、NotebookLM 摘要、舊文、聊天、錄音逐字稿
- 既有表現：Threads 表現、WordPress 資產、SEO 機會、歷史有效規則

輸出應穩定落在：

- Threads 排程與自動發布
- WordPress 長文草稿與沉澱
- Review 例外處理
- Analytics / Learning 規則回寫

## 2. Problem Statement

大多數人用 AI 做內容的方式是碎片化的：

- 想到題目才問 AI
- 拿到答案就發
- 發完不整理
- 下次又從零開始

這會造成：

- AI 寫出來不像自己
- 知識與素材無法持續複用
- 不知道什麼內容真的有效
- 帳號很難穩定自動營運
- 一旦帳號數增加，人工管理成本迅速上升

本產品要解決的核心問題是：

`如何讓一個人用 AI 穩定營運多個內容帳號，並讓每次創作都變成下一次更好的創作基礎。`

## 3. Product Goals

### 3.1 Primary Goals

- 讓每個啟用帳號都能持續有內容產出
- 讓 AI 內容更接近操盤者本人的風格
- 讓內容成為可沉澱、可檢索、可學習的資產
- 讓排程與發布流程穩定、可觀測、可追查
- 讓人工只處理少量高價值例外

### 3.2 Success Metrics

- 每個啟用帳號每天至少產出 1 個可發布候選
- 自動排程與發布維持穩定成功率
- Review 只承接少量例外，而不是主流程
- 使用者能在首頁一眼看出哪些帳號健康、哪些卡住
- 系統能從發布表現中產生新的 learning rules

### 3.3 Non-goals

- 不做團隊協作權限系統
- 不做多租戶 SaaS
- 不做企業級 BI 報表
- 不在 P0 追求所有平台的全自動發布

## 4. Product Scope

### 4.1 In Scope

- Threads 帳號自動營運
- WordPress 長文資產沉澱
- 多帳號 persona 管理
- 題目池、草稿、排程、發布、回收、學習
- 四層知識庫
- NotebookLM / Obsidian 手動匯入知識
- 背景任務、排程、失敗監控與例外處理

### 4.2 Out of Scope

- X API 自動發布
- 多人協作權限
- NotebookLM API 自動同步
- Obsidian 作為主資料庫
- 完整 CRM / 團隊營運功能

## 5. Core Workflow

### 5.1 Standard Operating Loop

系統固定主流程為：

`Ingest -> Normalize -> Retrieve -> Score -> Brief -> Draft -> Anti-AI -> Review Gate -> Schedule / Publish -> Metrics -> Learn`

### 5.2 Daily Workflow

1. 使用者手動匯入新的知識、語料與素材
2. 系統拆分、標記並寫入對應知識層
3. 系統依帳號 mission 與近期學習結果更新題目池
4. AI 產生 brief、draft 與 image brief
5. 高信心內容直接排程，低信心內容進 review
6. Scheduler 在到點時自動發布
7. 系統回收表現數據
8. 系統把有效規則沉澱回 learning loop

## 6. Information Architecture

### 6.1 Desk

首頁總控台，負責回答：

- 今天有沒有正常發文
- 哪些帳號卡住
- 哪些任務失敗
- 哪些內容需要人工判斷
- 今天最值得處理的下一步是什麼

### 6.2 Accounts

每個帳號是一條獨立營運線，應能看到：

- persona、tone、hook、CTA
- auto-generate 設定
- token 狀態
- 最近內容表現
- 當前內容目標
- 今日是否已有內容覆蓋

### 6.3 Review

只收：

- 低信心草稿
- 有風格偏差的草稿
- 缺證據的數據陳述
- 高價值轉化內容
- 需要 approval 的內容
- 發布失敗待重試項目

### 6.4 Factory

觀察背景任務與內容流水線，顯示：

- ingestion
- topic scoring
- draft generation
- anti-AI scan
- image generation
- publish dispatch
- metrics collection
- learning synthesis

### 6.5 Analytics

只看會改變下一輪決策的數字：

- 曝光
- 漲粉
- 書籤
- 互動
- 點擊
- 轉換
- 標題模式
- 內容類型效果

### 6.6 Ops

負責看：

- DB
- env
- schema
- scheduler
- token
- AI provider
- auto-publish readiness

## 7. Knowledge System Design

### 7.1 Voice Corpus

目的：讓 AI 寫得像使用者本人。

主要內容：

- 舊貼文
- 長文
- 聊天紀錄
- 語音逐字稿
- 隨手筆記
- Obsidian 中的個人觀點

主要資料物件：

- `VoiceSnippet`
- `StyleGuide`
- `StyleRule`
- `AntiAiRule`

### 7.2 Research Library

目的：讓內容建立在資料、案例與證據上。

主要內容：

- 外部文章
- 爆款結構
- 競品拆解
- NotebookLM 摘要
- Obsidian 研究筆記
- 可復用案例與金句

主要資料物件：

- `ResearchAsset`
- `CompetitorAccount`
- `CompetitorPost`
- `InsightCard`
- `ReusablePattern`

### 7.3 Content Pipeline

目的：把靈感變成穩定產線。

狀態流：

- `IdeaPool`
- `NeedsResearch`
- `ReadyToWrite`
- `Drafting`
- `Review`
- `Scheduled`
- `Published`
- `LearningBacklog`

主要資料物件：

- `TopicCard`
- `OperatingBrief`
- `DraftAsset`
- `ImageBrief`
- `PublishJob`

### 7.4 Learning Loop

目的：把每次發布結果變成下一次更好的規則。

主要資料物件：

- `PerformanceSignal`
- `LearningRule`
- `TitlePattern`
- `HookPattern`
- `FormatOutcome`

## 8. NotebookLM / Obsidian 手動匯入規格

更完整的知識輸入設計請參考：[Knowledge Ingestion Plan](./KNOWLEDGE_INGESTION.md)

### 8.1 Product Decision

NotebookLM 與 Obsidian 目前採 `手動匯入`，不做 API 自動同步。

### 8.2 Supported Inputs

使用者可手動匯入：

- NotebookLM 摘要與重點整理
- Obsidian 筆記與段落
- 舊貼文、長文、聊天、逐字稿
- 外部案例、研究文章、競品拆解

### 8.3 Target Libraries

每次手動匯入時，系統至少要能指定目標庫：

- `Voice Corpus`
- `Research Library`
- `Topic Seed`
- `Learning Note`

### 8.4 Default Routing

- `NotebookLM` 預設偏 `Research Library`
- `Obsidian` 可進 `Voice Corpus` 或 `Research Library`
- 帶有強烈第一人稱觀點的內容，預設建議進 `Voice Corpus`
- 偏總結、拆解、案例、資料的內容，預設建議進 `Research Library`

## 9. Account Operating Model

每個帳號都必須是一條可配置、可學習、可自動化的營運線。

### 9.1 Required Account Fields

- platform
- platformUsername
- personaLabel
- personaPrompt
- defaultTone
- topicFocus
- hookStyle
- ctaStyle
- voiceGuardrails
- autoGenerateEnabled
- autoGenerateMode
- autoGenerateTime
- autoGeneratePrompt
- autoGenerateGoal
- tokenExpiresAt
- isActive

### 9.2 Supported Outcome Goals

- 曝光
- 漲粉
- 書籤
- 轉化

### 9.3 Suggested Content Lanes

- 實戰教程
- AI + 變現
- 草根生意
- 趨勢判讀
- 人設敘事
- 數據復盤

## 10. Automation / Publishing

### 10.1 Publishing Rules

- 高信心、低風險內容可直接排程
- 需要 approval 的內容不能直接自動發布
- Scheduler 只處理 due posts
- 同一篇排程內容必須有 claim 機制，避免重複發布
- 發布失敗必須保留錯誤訊息
- token 接近到期時要先 refresh 或標示風險

### 10.2 Scheduling Sources

- Inngest 為主
- External cron 為 fallback
- 前端頁面載入不得觸發重型發文流程

### 10.3 Auto-publish Readiness

Ops 需要清楚顯示：

- Threads env 是否完整
- scheduler 是否最近真的跑過
- 啟用中的 Threads 帳號數
- expiring token 數
- due scheduled posts 數
- awaiting approval posts 數
- failed scheduled posts 數
- 最近一次排程發布或失敗紀錄

## 11. Functional Requirements

### 11.1 P0 Must-have

- 多帳號管理
- Threads 排程與自動發布
- WordPress 長文草稿沉澱
- 題目池與 draft 生成
- Review gate
- Scheduler / token / readiness 診斷
- NotebookLM / Obsidian 手動匯入
- 例外處理與失敗追蹤
- Desk 首頁總控台

### 11.2 P1 Should-have

- 完整 voice corpus 管理
- research library 檢索
- topic scoring
- anti-AI 規則化標記
- image brief 與 preset
- learning synthesis 回灌

### 11.3 P2 Could-have

- X 長文半自動分發
- 長文拆短文
- 短文擴長文
- 更多平台 adapter
- 更細的 growth scoring

## 12. Non-functional Requirements

### 12.1 Reliability

- 頁面部分資料失敗時必須降級顯示
- 單一診斷查詢不得造成整頁 500
- 發布鏈需可追蹤、可重試、可檢查

### 12.2 Performance

- Dashboard 頁面不得載入即執行重型任務
- 外部資料源延後讀取
- 背景任務需有批次上限
- 主要頁面採短週期 revalidate
- 預設能在 Zeabur 這類較小資源環境穩定運作

### 12.3 Observability

- 每條背景任務都要有 log
- 每次排程執行都要有結果
- 每次發布成功或失敗都要可追查
- 每個帳號都要能看見健康狀態與例外

## 13. Core Models / Interfaces

正式核心資料結構：

- `PlatformAccount`
- `Post`
- `VoiceSnippet`
- `StyleGuide`
- `StyleRule`
- `AntiAiRule`
- `ResearchAsset`
- `InsightCard`
- `ReusablePattern`
- `TopicCard`
- `OperatingBrief`
- `DraftAsset`
- `ImageBrief`
- `PerformanceSignal`
- `LearningRule`
- `TitlePattern`
- `HookPattern`
- `FormatOutcome`

平台抽象層：

- `DistributionTarget`
- `AnalyticsAdapter`
- `DraftProvider`
- `ImageProvider`

## 14. Delivery Roadmap

### P0：穩定營運層

目標：先讓掛進來的帳號穩定自動運轉。

- 收斂 `Desk` 成首頁總控台
- 補強 `Ops` 與 auto-publish readiness
- 固化 scheduler / publish / retry / approval 流程
- 建立 NotebookLM / Obsidian 手動匯入入口
- 建立帳號健康與例外可視化

### P1：內容飛輪層

目標：讓內容不是只會自動發，而是會越跑越準。

- voice corpus 管理
- style pack
- research library 檢索
- topic scoring
- anti-AI pass
- learning synthesis
- image brief workflow

### P2：平台與成長擴張層

目標：從單平台自動營運走向多平台內容資產系統。

- X 長文支援
- 跨平台改寫
- 長短文互轉
- 更細的 lane scoring
- 更高階的 growth suggestions

## 15. Test Plan

### 15.1 Core Publishing Scenarios

1. 有啟用帳號、有效 token、due post 時，scheduler 能自動發布
2. 多排程入口同時觸發時不會重複發布同一篇
3. token 即將到期時會顯示風險並可 refresh
4. requiresApproval 的內容不會直接自動送出
5. failed publish 會留下可追蹤錯誤訊息

### 15.2 Knowledge Ingestion Scenarios

1. 使用者可手動把 Obsidian 內容匯入 Voice Corpus
2. 使用者可手動把 NotebookLM 摘要匯入 Research Library
3. 匯入內容可正確標記 source type、topic tags、target library
4. 匯入後能在後續 topic brief / draft 流程被檢索到

### 15.3 Product Stability Scenarios

1. `Desk` 在局部資料失敗時仍可打開
2. `Ops` 在診斷失敗時仍可降級顯示
3. 不完整 env 時系統顯示缺失，不直接崩潰
4. 小規模雲端資源下頁面仍可正常返回

### 15.4 Learning Loop Scenarios

1. 發布後能回寫 performance signal
2. learning rules 可影響下一輪 scoring
3. 標題與內容型別成效能被分開觀察
4. 系統能區分曝光型、漲粉型、書籤型內容

## 16. Assumptions

- 主要使用者是單人操盤者
- 主要內容語言是中文
- Threads 是目前主發布平台
- WordPress 是長文資產庫
- NotebookLM 與 Obsidian 採手動匯入，不承諾 API 自動同步
- Obsidian 不作為主資料庫，只作為知識輸入源
- Inngest 是主排程機制，external cron 是備援
- 若有衝突，優先順序是：自動發文穩定性 > 可觀測性 > 知識飛輪 > 新平台擴張
