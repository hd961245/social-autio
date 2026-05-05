# Social Audio PRD v2

> Version: v2.1  
> Updated: 2026-05-05  
> Status: Current Product Direction  
> Repo: https://github.com/hd961245/social-autio

## 1. 產品定位

### 1.1 一句話定位

Social Audio 是一個給 `自媒體創業者` 使用的 `多帳號 AI 內容營運中台`。

它的核心不是幫你多生幾篇文，而是讓系統能夠：

- 自動吸收來源
- 自動產文
- 自動分流 Threads / WordPress
- 自動發布與沉澱
- 自動觀察、優化與回填學習

讓使用者只在 `例外、方向、商業轉化` 時介入。

### 1.4 目前已落地的營運飛輪

目前主產品方向已經包含以下自動飛輪：

- 自動探索來源與正文萃取
- 自動產出 Threads 草稿
- 高信心 Threads 自動排程 / 發布
- 強表現 Threads 自動沉成 WordPress
- GSC 機會自動轉成 SEO 優化稿
- 14 天後自動生成優化稿
- 每日日報自動送 Discord / Telegram
- 學習結果回灌到帳號 autopilot prompt

### 1.2 核心目標

這個產品目前的北極星是：

`7 個月內，推動接入帳號朝台灣前 50 大理財內容帳號（月流量）前進`

這代表產品所有主要模組，都要回答同一個問題：

- 這件事能不能幫帳號更穩定產出
- 這件事能不能幫帳號更快取得流量
- 這件事能不能幫內容沉成長期資產
- 這件事能不能幫整體營運自動化程度提高

### 1.3 產品承諾

產品應該把以下四種輸入，收成同一條內容供應鏈：

- 外部來源：RSS、網站、文章、官方一手訊號
- 長期知識：YouTube、podcast、未來的 Notion / Docs / Markdown
- 既有內容：Threads 強文、WordPress 舊文、SEO 機會頁
- 站台設定：mission、persona、editorial direction、商業承接方式

輸出則應穩定落到：

- Threads 發佈與排程
- WordPress 長文草稿與自動發布
- Review 例外處理
- Analytics / SEO / 14 天優化飛輪

## 2. 產品形態

### 2.1 一級區只有六個

產品正式收斂成六個一級區：

- `PM Ops`
  全帳號總控盤。看 mission、每日進度、各帳號健康、自動化狀態與例外。
- `Accounts`
  每個帳號的獨立營運線入口。每個帳號都應被視為一條獨立內容生意線。
- `Review`
  所有真正需要人工介入的例外與高價值拍板。
- `Factory`
  系統已自動處理、正在處理、失敗待修復的工廠層。
- `Analytics`
  只保留營運決策需要的數字、排行、機會與例外。
- `Config`
  所有非日常營運的設定與接線。

### 2.2 二級工作區角色

這些頁面仍然存在，但不再是平行主入口：

- `Sources`
  來源供應鏈管理
- `Compose`
  最後確認與送出
- `WordPress`
  長文沉澱與增長引擎工作區
- `Inbox / Queue`
  降級成 review / factory 的子流程，不再承接主入口角色

## 3. 核心工作流

### 3.1 Portfolio Scheduler

Portfolio scheduler 的角色是保證整站和全帳號都持續運轉：

- 檢查每個啟用帳號是否當天有達到最低一篇 Threads
- 檢查是否有高信心內容該直排 / 直發
- 檢查是否有 SEO / WordPress 長文機會該被推進
- 檢查 token、來源、失敗任務與其他例外

它的目標不是替代所有決策，而是確保：

`沒有任何一條帳號營運線停擺`

### 3.2 Account Autopilot

每個帳號都有自己的 account autopilot。

它必須能針對該帳號自動完成：

- 吃來源
- 選題
- 產文
- 排程 / 發布
- 沉到 WordPress
- 接回 14 天優化與 SEO 回補

帳號級決策必須優先吃到：

- 這個帳號自己的 mission
- 題材偏好與 source preference
- persona prompt / playbook
- 最近高表現內容
- 留言訊號
- AI brief / operating brief
- learning update（hook / CTA / topic 偏好）
- 長文與 SEO 機會

### 3.3 Exception Routing

Review 不是日常主流程，而是 `例外處理台`。

只有以下內容才應該送進 Review：

- 低信心 Threads 草稿
- 中信心但高風險的 WordPress / SEO 稿
- token / provider / publish 失敗
- 缺 editorial direction 或 source 不乾淨
- 高價值但需要你最後確認的商業承接內容

產品的設計原則是：

`正常情況系統自己跑，只有例外才叫人`

### 3.4 Explore -> Brief -> Build -> Validate -> Learn

內容營運主線應收成以下迴圈：

`探索 -> brief -> 開發 -> 驗證 -> 下一步`

對應系統行為：

- `探索`
  自動吃來源、GSC 機會、強表現舊文與長期知識來源
- `Brief`
  先生成 operating brief，決定這篇要驗證什麼、先走 Threads 還是先沉 WordPress
- `開發`
  AI 根據帳號 persona、mission、learning prompt 產出內容
- `驗證`
  Threads / GA4 / GSC / 14 天觀察層回收數據與訊號
- `下一步`
  系統決定要 follow-up、優化、沉長文，還是回補 SEO 機會

## 4. Threads / WordPress / AI 三層角色

### 4.1 Threads

Threads 是第一增長曲線，負責：

- 快速驗證題目
- 穩定保持曝光與發文頻率
- 回收互動與留言訊號
- 提供給 14 天優化與 follow-up 飛輪

在高自動模式下，Threads 應該盡量做到：

- 自動找題
- 自動寫稿
- 高信心可直排 / 直發
- 每帳號每天至少一篇
- 寫法更像真人，不像 AI 摘要機或公告機器

### 4.2 WordPress

WordPress 是第二增長曲線，負責：

- 長文沉澱
- SEO 承接
- CTA / affiliate / referral 承接面
- 強 Threads 內容的延伸擴寫
- 舊文與高機會頁的更新放大

它不再只是草稿池，而是：

`每帳號自己的長文增長引擎`

### 4.3 AI

AI 在這個產品裡不是單一按鈕，而是固定四種角色：

- 找題與機會分類
- 根據 assignment 產文
- 根據回饋優化舊文
- 根據來源與知識庫持續自動出稿

AI 的成功標準不是「能寫」，而是：

- 寫得像真人
- 更像該帳號本人
- 能推進 Threads / WordPress 其中一條增長線
- 能減少人工日常操作

## 5. 來源供應鏈

### 5.1 四層來源策略

來源正式分成四層：

- `官方一手訊號`
  TWSE、SEC、Fed、BLS、BEA、Treasury 等
- `媒體快訊`
  台股 / 美股 feed、新聞快訊、headline 型內容
- `深度研究 / 長文`
  部落格、研究站、專欄、深入分析
- `長期知識來源`
  YouTube、podcast、未來的 Notion / Docs / Markdown

### 5.2 統一處理原則

來源進系統後，都應該走同一條供應鏈：

`discovery -> article-body-first normalization -> quality scoring -> source lane classification -> autopilot / review / WordPress / SEO`

產品應優先抽文章本體，不應把：

- 側欄
- 相關文章
- footer
- 媒體站版面噪音

一起當成正文。

### 5.3 帳號化分發

來源不再只是站台共用池，而要能被帳號化吸收。

原則是：

- 每個帳號有自己的 source preference
- 同一來源可被多帳號使用
- 但分發時有主優先帳號
- autopilot 先按帳號 mission、題材與 source lane 分派

## 6. 高自動營運原則

### 6.1 預設採高自動

系統預設不是 review-first，而是：

`高自動，例外才進 review`

### 6.2 核心自動規則

系統必須遵守：

- 每個啟用中的帳號，每天至少一篇 Threads
- `near_full_auto` 下：
  - 高信心 Threads 直接排程 / 發布
  - 中信心 Threads 可直接排程，除非觸發例外
  - 高信心 WordPress SEO / 長文稿可直接發布
- 自動刷新來源、匯入正文、產文、排程、發布應串成同一條 scheduler / heartbeat 鏈
- 低信心內容只進觀察池或 Review
- Review 不能阻塞整體飛輪

### 6.3 使用者介入原則

使用者主要只在以下時機介入：

- 方向改變：mission / editorial direction 調整
- 例外處理：失敗任務、低信心內容、高風險內容
- 商業承接：CTA / affiliate / referral
- 高價值拍板：要不要讓這篇進更大的放大飛輪

### 6.4 每日日報原則

產品應在固定時間主動回報：

- 過去 24 小時自動產了幾篇 Threads
- 自動發布了幾篇 Threads / WordPress
- 哪些是高價值擴寫或 SEO 機會
- 哪些失敗或例外真的需要人處理

預設通知通道優先順序：

- Discord webhook
- Telegram

## 7. 擴張接口

### 7.1 DistributionTarget

目前 distribution target 先支援：

- Threads
- WordPress

但資料與任務命名必須保留可擴張性，後續能再接：

- X
- LinkedIn
- Facebook
- IG
- newsletter / landing page

### 7.2 ConversionSurface

目前 conversion surface 先支援：

- WordPress CTA
- affiliate blocks
- referral / 導流承接塊

之後再往真正的轉介頁或商業承接面擴。

### 7.3 ContentInputAdapter

輸入接口要能統一承接：

- RSS / site / URL
- YouTube
- podcast
- future Notion / Docs / Markdown

這樣未來擴張不會破壞既有 Threads / WordPress 主線。

## 8. 成功指標

### 8.1 站台級

站台級成功指標包括：

- 7 個月北極星目標進度
- 全帳號每日內容產出是否穩定
- 全站自動化覆蓋率是否提升
- PM Ops 是否能只剩少量例外
- 每日日報是否足夠讓使用者不開站也知道系統在做什麼

### 8.2 帳號級

帳號級成功指標包括：

- 每帳號每天至少一篇 Threads 是否穩定達成
- 每帳號近 14 天是否有穩定流量與內容回收
- 每帳號是否有自己的 WordPress / SEO 增長承接
- 每帳號是否有可運作的 source preference 與 autopilot
- 每帳號的 learning update 是否實際影響下一輪生成

### 8.3 自動化級

自動化級成功指標包括：

- 自動找題成功率
- 自動產文成功率
- 高信心內容直排 / 直發率
- 強內容沉長文率
- SEO 機會處理率
- 失敗任務是否能集中到少量 exception queue
- brief / learning / experiment loop 是否持續在跑

## 9. 最終產品原則

Social Audio v2 不是一組 AI 工具拼盤。

它應該是一個真正會自己運轉的：

`多帳號 AI 內容營運中台`

也就是：

- 用 PM Ops 看整體盤面
- 用 Accounts 看每條營運線
- 用 Review 處理少量例外
- 用 Factory 看背景工廠
- 用 Analytics 看下一輪該怎麼放大

最終狀態應該是：

`系統自己找題、自己寫、自己分流 Threads / WordPress、自己排程 / 發布、自己觀察 / 優化 / 回填，使用者只在必要時介入`
