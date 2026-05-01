# Social Audio Roadmap

> Version: v2.0  
> Updated: 2026-05-01  
> Scope: milestone roadmap for evolving Social Audio into an AI operating console for self-media entrepreneurs

## 1. Roadmap Goal

這份 roadmap 的目標不是再加更多零散功能。

它要回答的是：

`接下來要怎麼把 Social Audio 從「能用的內容工具」推成「可持續經營的自媒體創業中台」`

接下來的優先順序應該圍繞四件事：

- 讓日常流程更穩
- 讓來源與知識沉澱更強
- 讓 AI 真的能持續幫你工作
- 讓內容逐步變成可複用、可變現的資產

## 2. Milestone Map

整體里程碑分成 5 段：

1. `M1 穩定營運底座`
2. `M2 來源與知識飛輪`
3. `M3 AI 寫作與排程引擎`
4. `M4 回饋式內容優化`
5. `M5 自媒體創業者經營中台`

## 3. M1 穩定營運底座

### 3.1 目標

讓使用者每天真的敢打開系統來發文、排程、看結果，而不是擔心：

- Threads 綁定突然失效
- 排程到底有沒有跑
- AI provider 到底有沒有通
- DB / schema 一換電腦就出事

### 3.2 核心能力

- Threads OAuth / callback diagnostics
- Ops health / deploy checklist
- Publish health / outcome log
- Queue 手動立即執行排程
- WordPress draft-only workflow 穩定化
- Schema / env 錯誤人話化

### 3.3 完成定義

做到這些才算 M1 完成：

- 使用者可以穩定綁定 Threads 帳號
- 發文與排程失敗時，能立刻知道原因
- 換電腦或重部署時，有明確檢查入口
- WordPress draft 狀態不再是黑盒

### 3.4 當前狀態

`大致已完成`

這一階段已經有相當多成果，但仍需持續維護穩定性。

## 4. M2 來源與知識飛輪

### 4.1 目標

讓系統不只是收來源，而是能穩定把外部訊號轉成你的內容候選池。

核心要解的是：

- 今天有哪些來源值得寫
- 哪些來源是高訊號，哪些只是噪音
- 沒有 RSS 的部落格要怎麼抓
- 抓下來的文章如何正規化
- 如何讓來源不只是「資訊」，而是「可再利用的題目資產」

### 4.2 核心能力

- Source Watchlist
- Inbox / Source Quality Grading
- RSS / site / URL mode auto-discovery
- Feed discovery / sitemap / homepage article discovery
- Readability-based normalization
- candidate rationale
- Desk 首屏的高訊號來源顯示
- 財經新聞來源分層（台股 / 美股）
- article-body-first extraction
- finance starter packs by market / depth lane
- transcript-first knowledge ingestion plan

### 4.3 完成定義

做到這些才算 M2 完成：

- 使用者新增一個站點時，不用自己猜要用 RSS 還是 site mode
- 沒有 RSS 的站也能抓到相對穩定的文章候選
- 來源會被分成 `高可寫 / 可觀察 / 低訊號`
- 每篇候選草稿都能說出「為什麼是這篇」

### 4.4 當前狀態

`已接近完成`

這一段目前已經很強，下一步是把來源訊號更深地餵回 autopilot 與 review queue。

## 5. M3 AI 寫作與排程引擎

### 5.1 目標

讓 AI 不只是「按一下幫你寫一篇」，而是能在可控條件下持續出稿。

這段要把 AI 從單次工具，推成 `可持續的內容引擎`。

### 5.2 核心能力

- Compose 內建 AI 起稿
- persona-aware generation
- Content Engine 來源改寫
- style memory / persona memory / playbook-aware generation
- 每個 persona 的 autopilot 設定
- 手動 `儲存並立即生一篇`
- 自動 draft candidate generation
- 自動排程時段推估

### 5.3 完成定義

做到這些才算 M3 完成：

- 每個 persona 都能穩定手動試跑 AI 產文
- 每個 persona 都能切換 `draft` 或 `scheduled`
- AI 生成內容會吃 persona、站台方向、近期來源、近期高表現內容
- 使用者能信任 autopilot 不是亂生文

### 5.4 當前狀態

`已達第一版`

第一版已具備，但還需要更強的觀測與更明確的「這篇 AI 是根據什麼產的」。

## 6. M4 回饋式內容優化

### 6.1 目標

讓系統開始真的「學會經營」，而不是一直從零開始寫。

這一段的核心是：

- 發出去之後，系統怎麼學
- 留言、互動、表現，怎麼變成下一篇的輸入

### 6.2 核心能力

- Analytics / rewrite radar
- reply insights
- optimize-from-replies
- autopilot feedback loop
- top post memory
- persona-level analytics
- persona routing from content fit

### 6.3 完成定義

做到這些才算 M4 完成：

- 系統能從留言中整理出可操作洞察
- 系統能根據留言生成 follow-up draft
- autopilot 不再只是照 persona 固定出稿，而是會參考最近有效內容
- 使用者能清楚知道不同 persona 現在更適合怎麼寫

### 6.4 當前狀態

`已啟動，但仍需加深`

這一段最值得繼續推，因為它會直接讓 AI 越跑越像真的在幫你經營。

## 7. M5 自媒體創業者經營中台

### 7.1 目標

讓產品從 `AI 內容生產系統` 升級成 `自媒體創業者經營系統`。

這一段不只管文章，還要開始管：

- 題材資產
- 商業機會
- 長文沉澱
- 內容支柱
- 變現結構

### 7.2 核心能力

- Inventory stage view
- monetizable / expandable classification
- affiliate slot library
- WordPress archive rewrite
- WordPress style learning
- site-level editorial direction
- campaign / pillar / offer-aware planning
- 外部知識輸入平台評估與接入
- YouTube / Podcast transcript ingestion

### 7.3 完成定義

做到這些才算 M5 完成：

- 使用者不只是在發文，而是在經營自己的內容庫存
- 高表現內容能被沉澱成長文資產
- 商業位與 CTA 不再是手動每篇重做
- 系統開始有「這題值不值得變成生意資產」的能力

### 7.4 當前狀態

`已建立雛形`

WordPress、affiliate library、inventory 已經在這條路上，但還沒有完全收斂成成熟的經營中台。

## 8. Recommended Build Order

如果接下來照里程碑順序持續推，我建議這樣排：

1. `M3 補穩`
   把 autopilot 的可觀測性、成功率、candidate 透明度再補強
2. `M4 做深`
   把留言洞察、表現回饋、follow-up draft 變得更像真正的內容學習回路
3. `M5 收斂`
   把 content inventory、WordPress 沉澱、monetization 結構真正收成經營中台

## 9. Four-Week Suggested Focus

### Week 1

主題：
`Autopilot reliability and visibility`

重點：

- 明確顯示 autopilot 成功 / 失敗原因
- 顯示 autopilot 這篇是根據哪些來源與哪些高表現內容生成
- 讓 review queue 更明確區分手動稿與自動稿

### Week 2

主題：
`Feedback-driven rewriting`

重點：

- 留言洞察更穩定
- follow-up draft 更像原 persona
- 讓高表現 Threads 的改寫路徑更短

### Week 3

主題：
`Knowledge and archive leverage`

重點：

- 強化 WordPress archive reuse
- 強化內容模板與知識沉澱
- 把來源、舊文、Threads 勝利內容收成更清楚的題材資產
- 評估 YouTube / Podcast transcript-first ingestion
- 評估外部知識平台作為內容輸入源

### Week 4

主題：
`Monetization-aware operating layer`

重點：

- 更完整的 CTA / affiliate injection strategy
- 更清楚的 monetizable content signals
- 開始把內容與商業目標連起來

## 10. Current Highest-Value Bet

如果只選一個現在最值得做的方向，我會押：

`把 autopilot 產文做成可觀測、可理解、可持續優化的內容引擎`

因為一旦這條線穩了，你整個產品就不只是工具，而會開始真的像：

`一位自媒體創業者的 AI 經營系統`
