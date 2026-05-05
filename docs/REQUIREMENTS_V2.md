# Social Audio Requirements v2

> Version: v2.0  
> Updated: 2026-05-05  
> Type: 功能需求清單 + 驗收標準

## 1. PM Ops

### 目標

把首頁正式收成 `全帳號總控盤`，讓使用者一進站只看：

- 總 mission
- 全帳號每日營運進度
- 例外與缺口
- 最小介入清單

### 需求清單

#### P0

- 顯示總 mission 與 7 個月目標進度
- 顯示全帳號今日自動產文 / 已排程 / 已發布 / 已沉長文
- 顯示各帳號營運列
  - 今日已發
  - 今日已排程
  - WordPress 放大數
  - 例外數
  - token / autopilot 健康狀態
- 顯示今天沒滿一篇的帳號提醒
- 顯示最小例外清單
- 顯示 Search Growth 與高價值來源 / 草稿訊號

#### P1

- 顯示近 14 天帳號級流量趨勢摘要
- 顯示 account ranking
- 顯示 mission 對各帳號的自動決策偏向說明

#### Deferred

- portfolio 級商業轉化總覽
- portfolio 級 referral funnel

### 完成定義 / 驗收標準

- 打開首頁時，使用者不需要先進 Compose 才知道今天該做什麼
- 首頁顯示的是總控盤，而不是工具拼盤
- 使用者能在首頁一眼看出：
  - 哪個帳號今天還沒滿一篇
  - 哪些例外需要介入
  - 哪些來源 / SEO 機會值得放大

## 2. Accounts

### 目標

把每個帳號升級成 `獨立營運線`，不再只是設定頁。

### 需求清單

#### P0

- 帳號總覽頁顯示帳號級 portfolio 摘要
- 每個帳號都有獨立頁面
- 每個帳號頁固定有六區：
  - Account Mission
  - Publishing Lane
  - Source Lane
  - Optimization Lane
  - WordPress Lane
  - Exceptions
- 顯示帳號自己的 mission / source preference / lane hint
- 顯示帳號自己的今日已發、已排程、待拍板、可直發、WordPress 放大數

#### P1

- 帳號級 source preference 可視化更明確
- 帳號級 mission 與全站 mission 的差異化策略說明
- 帳號級成長排序與對比

#### Deferred

- 帳號級商業位配置面板
- 多品牌 / 多站台級別的帳號集群視圖

### 完成定義 / 驗收標準

- 使用者進入單一帳號頁時，能把這個帳號當成一條獨立營運線來看
- 帳號頁不再只是 persona / autopilot 設定表單

## 3. Review

### 目標

Review 只承接真正需要人工介入的內容，不再承接日常主流程。

### 需求清單

#### P0

- 收 Threads 低信心或高風險稿
- 收中信心 WordPress / SEO opportunity
- 收高價值但需要最後拍板的內容
- 收失敗任務例外
- 顯示例外理由與下一步建議

#### P1

- 例外按類型分流：
  - Threads
  - WordPress
  - SEO
  - Automation failure
- 顯示例外影響等級與建議處理優先順序

#### Deferred

- 多人 review 分工
- review SLA / history

### 完成定義 / 驗收標準

- 使用者日常不需要先進 Review 才能開始工作
- Review 只剩少量例外，不應變成主要作業台

## 4. Factory

### 目標

Factory 成為背景工廠層，集中呈現系統已處理、正在處理、失敗待修復的內容與任務。

### 需求清單

#### P0

- 顯示三層：
  - 已自動處理
  - 正在處理
  - 失敗待修復
- 顯示自動事件類型：
  - source refresh
  - source import
  - draft generation
  - direct scheduling
  - direct publishing
  - wordpress expansion
  - seo opportunity handling
  - optimization rewrite
- 顯示最近 14 天工廠輸出摘要

#### P1

- 按帳號聚合工廠事件
- 可快速跳到受影響帳號或內容

#### Deferred

- 工廠級批次重跑
- 工廠成本 / token 用量看板

### 完成定義 / 驗收標準

- 使用者能知道系統最近自己做了哪些事
- 失敗事件不需要翻 log 才看得到

## 5. Analytics

### 目標

Analytics 只保留營運決策需要的數字、排行、機會與例外。

### 需求清單

#### P0

- GA4 站台級流量摘要
- GSC 搜尋摘要
- Threads 內容表現回收
- SEO opportunity queue
- 帳號級 / 內容級高表現訊號

#### P1

- 帳號級 GSC / GA4 對照
- Threads -> WordPress 放大效果回看
- 14 天優化結果回看

#### Deferred

- 多站台跨 portfolio analytics
- 商業轉化 attribution

### 完成定義 / 驗收標準

- 使用者能在 Analytics 知道哪篇該放大、哪個帳號在贏、哪個搜尋頁面值得補
- 不依賴大型圖表也能做決策

## 6. Config

### 目標

Config 只放非日常營運設定，不承接日常操作。

### 需求清單

#### P0

- AI provider 設定
- source starter packs
- mission / editorial direction
- WordPress publish defaults
- distribution defaults
- OAuth / env / connector 接線導引

#### P1

- mission templates
- account default profiles

#### Deferred

- 多團隊權限
- 組織級政策管理

### 完成定義 / 驗收標準

- 使用者不需要進 Config 才能完成日常營運
- Config 的角色明確是設定，不是工作流入口

## 7. Automation

### 目標

把系統自動營運拆成清楚的三層：

- portfolio scheduler
- account autopilot
- exception routing

### 需求清單

#### P0

- 每個啟用帳號每天至少一篇 Threads
- portfolio scheduler 檢查各帳號是否掉線
- account autopilot 可自動：
  - 刷新來源
  - 匯入正文
  - 產文
  - 高信心直排 / 直發
  - 強內容沉 WordPress
  - SEO opportunity 分流
- daily report 通知
- 例外進 Review，不阻塞其他帳號

#### P1

- mission-driven scoring 更細緻
- autopilot 按帳號 source preference 分派來源
- optimization rewrite 更帳號化

#### Deferred

- 自動跨平台分發
- 自動 referral page 建立

### 完成定義 / 驗收標準

- 高自動模式下，正常情況系統不需要人工日常按流程
- 使用者主要只看例外、方向與商業承接

## 8. Future Expansion

### 目標

預留未來擴張，不在本輪直接實作。

### 需求清單

#### P0

- 保留 `DistributionTarget` 抽象
- 保留 `ConversionSurface` 抽象
- 保留 `ContentInputAdapter` 抽象

#### P1

- referral surface
- newsletter / landing page 承接
- future social channels

#### Deferred

- Notion / Docs 正式接入
- podcast 全自動 transcript ingestion
- X / LinkedIn / FB / IG 發佈

### 完成定義 / 驗收標準

- 新平台接口命名不能綁死只有 Threads / WordPress
- 現有實作不因未來擴張而需要大改資料與任務語義

## 9. 總體驗收標準

### P0 必須成立

- 首頁先看到全帳號總控盤
- 點進帳號可看到完整獨立營運線
- 正常情況下，系統能自己找題、自己寫、自己分流、自己排程 / 發布
- Review 只剩少量例外
- WordPress 能承接長文與 SEO 增長線

### P1 補強方向

- 更強的帳號級 mission 與 source preference
- 更強的帳號級 analytics / optimization 對照
- 更強的工廠 / SEO / 長文飛輪可視性

### Deferred

- 多平台分發
- referral / 商業轉化引擎
- 外部知識平台深度接入
