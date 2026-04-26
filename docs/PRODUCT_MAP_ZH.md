# Social Audio 產品地圖

> 更新時間：2026-04-26  
> 目的：用中文快速盤點目前這個專案「已做到哪」、「各模組在做什麼」、「接下來最值得往哪裡走」。

## 1. 目前這是什麼產品

`Social Audio` 現在不是單純的 Threads 發文工具，而是：

`以 Threads 為主發佈通道、以 WordPress 為長文草稿庫、由 AI 協助選題、改寫、排程與復盤的單人內容營運中台`

它目前最適合的使用方式是：

`一個人營運多個 persona，持續把短內容變成可複用的內容資產`

---

## 2. 核心工作流

目前最完整的一條線是：

`Source -> Persona -> Draft -> Schedule / Publish -> Review -> Follow-up -> Expand to WordPress`

拆開來看：

1. 從 `Sources / Inbox / Content Engine` 吃進素材
2. 把素材路由到最合適的 Threads persona
3. 用 AI 依 persona 幫你起草
4. 在 `Compose` 微調、排程或立即發佈
5. 到 `Posts / Analytics` 看單篇表現與留言訊號
6. 再用 AI 把高價值留言轉成 follow-up draft
7. 覺得值得放大時，再同步成 WordPress draft

---

## 3. 已有模組

### A. 帳號與人設

- 多 Threads 帳號
- 每帳號獨立 persona
- persona playbook
- 每帳號可設：
  - 人設名稱
  - 人設基底
  - 預設語氣
  - 題材範圍
  - hook 風格
  - CTA 風格
  - 語氣禁區

### B. AI 寫作

- `Compose`：
  - 幫我寫一版
  - 幫我優化目前這版
  - brief-driven 起稿
- `Content Engine`：
  - 吃 URL / text / image
  - 生成 Threads + WordPress draft
- `Style Memory`：
  - 吃 WordPress 舊文風格
  - 吃最近已發 Threads 節奏
  - 共同供 Compose / Content Engine / Autopilot 使用

### C. 發佈與排程

- 立即發 Threads
- 排程 Threads
- Inngest 自動跑 scheduler
- 可選 Telegram approval
- 發佈結果與錯誤會寫 log

### D. 自動化

- 每 persona 每日自動生文
- 可設定：
  - 每天時間
  - 產出模式：draft / scheduled
  - 每日方向提醒
  - 希望達成的效果
- 系統會依歷史表現推一個較好的排程時段
- 可手動試跑一篇 autopilot

### E. 留言學習與二次放大

- 抓已發布 Threads 的 replies
- AI 整理留言洞察：
  - summary
  - tension
  - opportunity
  - follow-up angle
- 依留言生成 follow-up draft
- 依留言直接生成並排程一篇 follow-up

### F. WordPress 工作流

- 接入 WordPress 後台
- 只建立 / 更新 draft，不直接發佈正式文章
- 可分析全部舊文，提取寫作風格
- 可套用 LarryChen editorial preset
- 可把 Threads 內容同步成長文草稿

### G. 營運與診斷

- Ops diagnostics
- callback diagnostics
- DB readiness / schema drift 提示
- publish outcome log
- automation log
- GA4 overview

---

## 4. 目前最強的地方

這個專案現在最強的，不是單一發文功能，而是這三個能力開始接起來了：

### 1. Persona-aware writing

AI 不只是 generic copywriter，而是會依：

- persona
- WordPress style memory
- 最近 Threads 表現

來寫出比較像你的內容。

### 2. Content reuse loop

一份素材可以變成：

- Threads draft
- 排程貼文
- follow-up
- WordPress draft

開始形成內容資產複用。

### 3. Reply learning loop

不是只發完就結束，而是：

- 看留言
- AI 解讀留言訊號
- 生成下一版更準的 follow-up

這讓系統開始有「內容學習迴路」。

---

## 5. 目前的邊界

這個產品現在明確偏向：

- 單人營運
- Threads-first
- 內容型工作流
- AI 協作而不是完全黑盒自動化

目前還不是：

- 多人協作 SaaS
- 有權限管理的團隊產品
- 完整 CRM / growth suite
- 大規模多平台社群矩陣系統

---

## 6. 現階段最值得繼續做的方向

### 1. Persona outcome learning

讓系統不只推好時段，還能學：

- 哪種 hook 比較有效
- 哪種 CTA 比較帶留言
- 哪個 persona 最近更適合什麼題材

### 2. Reply-driven automation

讓高訊號留言不只手動生成 follow-up，而是：

- 達到條件就自動建議
- 或自動進 queue 等你確認

### 3. WordPress editorial system 更完整

把：

- pillar
- audience stage
- CTA strategy
- internal linking

再做深一層，變成更完整的內容資產系統。

### 4. Asset metadata / inventory intelligence

讓每篇內容有更完整的標記：

- 可擴寫
- 可二創
- 可變現
- 可做 lead magnet

這樣之後做內容商業化會更順。

---

## 7. 一句話總結現在階段

如果只用一句話形容現在的 `Social Audio`：

`它已經是可用的 AI 內容營運中台第一版，而且開始有 persona 學習與留言反饋迴路。`
