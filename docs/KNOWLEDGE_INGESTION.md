# Knowledge Ingestion Plan

> Version: v1.0  
> Updated: 2026-05-10
> Scope: define the next-stage knowledge input architecture for Social Audio

這份文件是知識輸入專項設計文件，正式產品定義請同步參考 [PRD v3](./PRD_V3.md)。

## 0. Current Product Decision

目前 `NotebookLM` 與 `Obsidian` 採 `手動匯入`，不做 API 自動同步。

在目前產品裡，兩者的預設角色是：

- `NotebookLM`
  - 預設偏 `Research Library`
  - 適合承接摘要、研究重點、案例整理、可復用觀點
- `Obsidian`
  - 可進 `Voice Corpus` 或 `Research Library`
  - 如果是第一人稱觀點、語氣、原始想法，優先進 `Voice Corpus`
  - 如果是拆解、資料、研究筆記、案例彙整，優先進 `Research Library`

這個定位應和 [PRD v3 的知識系統設計](./PRD_V3.md#7-knowledge-system-design) 保持一致。

## 1. Goal

這份文件要回答的不是「還能不能多接幾個來源」。

它要回答的是：

`怎麼把外部財經資訊、深度文章、影音 transcript 和你自己的筆記，變成可持續再利用的內容輸入層。`

產品要從單次改寫工具，往下收成：

- 可持續輸入的財經來源池
- 可正規化的文章本體
- 可沉澱的影音 transcript
- 可回收的個人知識庫

在現階段，這個輸入層除了外部來源，也必須明確吃得下：

- Obsidian 手動貼入的筆記與段落
- NotebookLM 手動整理出的摘要與知識重點

## 2. Input Layers

### Layer A: 快節奏新聞來源

用途：

- 做每日 Threads 候選稿
- 做快評、觀點、盤中 / 盤後判斷

優先來源型態：

- RSS
- RSSHub route
- 可穩定更新的 markets / headline page

代表方向：

- 台股新聞
- 美股快訊
- 總經 headline
- ETF / fund updates

### Layer B: 深度文章來源

用途：

- 做觀點型 Threads
- 做 WordPress 長文底稿
- 做系列拆解與知識延伸

優先來源型態：

- site mode
- sitemap article discovery
- homepage article discovery
- readability-based main body extraction

代表方向：

- 研究站
- 理財部落格
- 產業分析文章
- 無 RSS 深度內容站

### Layer C: 長期知識沉澱來源

用途：

- 沉澱核心觀點
- 累積長期內容支柱
- 建立可再拆解的知識庫

優先來源型態：

- YouTube transcript
- podcast transcript
- 自有筆記平台
- newsletter archive
- Obsidian 筆記
- NotebookLM 摘要

### Layer D: 個人語料與風格來源

用途：

- 建立個人風格記憶
- 讓 AI 更像操盤者本人
- 提供 draft 前的 voice pack

優先來源型態：

- 舊貼文
- 長文
- 聊天紀錄
- 語音逐字稿
- Obsidian 第一人稱筆記

## 3. GitHub References Worth Using

這些不是都要直接接進產品，而是目前最值得當參考或後續實作基底的專案。

### 3.1 財經資料 / 財經來源

- [FinMind](https://github.com/FinMind/FinMind)
  - 最適合補台股數據、台股消息面、美股 / 債券 / 總經資料
  - 不是單純新聞 feed，而是可當 AI 起稿的背景訊號層

- [RSSHub](https://github.com/DIYgod/RSSHub)
  - 最適合把原本沒有好 feed 的站點轉成可訂閱輸入
  - 之後可以評估哪些台美股站有合適 route

- [rss-news-list](https://github.com/vandenbroucke/rss-news-list)
  - 適合補更多國際新聞 feed 清單
  - 可當來源擴充參考，不一定直接內建

### 3.2 無 RSS 文章抓取

- [mozilla/readability](https://github.com/mozilla/readability)
  - 已是目前正文正規化主方案
  - 重點是抽文章本體，不吃側欄、推薦區塊

- [Crawl4AI](https://github.com/unclecode/crawl4ai)
  - 適合未來整站深抓、翻頁、批量研究站 ingestion
  - 如果 site mode 要升級，這是最值得看的方向

- [feed-extractor](https://github.com/extractus/feed-extractor)
  - 適合補 feed normalization
  - 可當 rss-parser 以外的下一階段候選

### 3.3 YouTube / podcast transcript

- [podscript](https://github.com/cottongeeks/podscript)
  - 適合 podcast transcript 主線
  - 支援音訊 URL 與 transcript cleanup

- [youtube-transcriber](https://github.com/lifesized/youtube-transcriber)
  - 適合 YouTube + Spotify podcast transcript workflow
  - 有 transcript / summarize / library 的完整概念

- [youtube-transcript-mcp](https://github.com/emit-ia/youtube-transcript-mcp)
  - 適合當 transcript extraction 服務參考
  - 偏工具化、可組裝

## 4. Finance Source Strategy

### Immediate Sources

這一層先直接用產品內建來源包：

- 台股與台灣市場
- 美股與全球股市
- 總經與利率觀察
- ETF 與配息題材
- 台灣研究與理財深度站
- 美股研究與全球市場深度站

### Mid-term Upgrade

之後可以評估：

- RSSHub route integration
- FinMind-backed signal summaries
- more finance source packs by sector
- site-level quality scoring tuned for finance news

### Long-term Goal

不是收越多來源越好，而是做到：

- 每天有足夠高品質候選題
- 候選題能分成快評 / 深度 / 沉澱
- AI 會優先吃高可寫來源

## 4.5 Authoritative / First-Party Sources

如果你想讓內容不只建立在媒體轉述，而是更靠近原始訊號，優先層應該放這些官方來源：

- [TWSE RSS / 官方新聞入口](https://www.twse.com.tw/zh/terms/rss.html)
  - 台股官方市場訊息、公告入口
- [SEC RSS Feeds](https://www.sec.gov/about/rss-feeds)
  - 美國監管公告與 EDGAR 相關更新
- [Federal Reserve RSS Feeds](https://www.federalreserve.gov/feeds)
  - 聯準會新聞、貨幣政策、利率資料 feed
- [BLS RSS Feeds](https://www.bls.gov/feed/)
  - 就業、通膨、勞動市場等官方釋出
- [BEA News Feed](https://apps.bea.gov/rss/rss.xml)
  - 美國 GDP、消費、國際收支等官方經濟數據釋出
- [U.S. Treasury Press Releases](https://home.treasury.gov/news/press-releases/)
  - 財政部政策與公債 / 宏觀相關公告

這些來源的角色不是每天都拿來直接改寫，而是：

- 幫你建立可信的市場脈絡
- 當媒體 headline 很吵時回頭找一手訊號
- 在需要做政策 / 宏觀 / 監管拆解時，提供更穩的原始輸入

## 5. YouTube / Podcast Transcript Architecture

### 5.1 Product Goal

把 YouTube / podcast 從「偶爾手動整理」變成：

`可持續輸入、可搜尋、可再改寫、可沉長文的知識來源`

### 5.2 First Principle

先走：

`caption-first -> transcript normalization -> AI structuring`

再走：

`ASR fallback`

也就是：

1. 先抓現成字幕 / transcript
2. 把 transcript 正規化
3. 先做章節、重點、可改寫片段
4. 沒字幕時，再進語音轉文字

官方能力參考：

- [YouTube Data API captions docs](https://developers.google.com/youtube/v3/docs/captions)
  - 官方 captions 資源與限制說明

### 5.3 Proposed Data Flow

1. `Source Input`
   - YouTube URL
   - podcast episode URL
   - RSS podcast feed

2. `Transcript Fetch`
   - captions / transcript
   - transcript API
   - audio-to-text fallback

3. `Normalization`
   - 去時間戳
   - 去重複口語 filler
   - 斷句
   - speaker / chapter segmentation

4. `Knowledge Structuring`
   - summary
   - key ideas
   - arguments
   - examples
   - follow-up questions

5. `Content Outputs`
   - Threads draft
   - WordPress draft
   - knowledge note
   - persona-specific angle candidates

### 5.4 Schema Direction

長期可考慮新增：

- `KnowledgeSource`
- `TranscriptAsset`
- `KnowledgeChunk`
- `KnowledgeInsight`

但在第一版前，不一定要先做完整 schema。

先做最小版也可以：

- ingestion record
- normalized transcript text
- summary / topic tags
- generated posts

## 6. Other Content Platforms to Evaluate

必要時可接，但以「能不能提供高品質輸入」為標準。

優先評估：

- Notion
- Google Docs
- Obsidian / Markdown vault
- newsletter archive

適合進來的條件：

- 有原始觀點
- 有研究摘要
- 有長期可再拆內容
- 不只是雜訊收集器

## 7. Suggested Build Order

### Phase 1

- 擴完整理財 starter packs
- 把 source lane 餵進 autopilot
- 把來源理由顯示在 review / desk

### Phase 2

- source quality tuned for finance-specific sources
- RSSHub candidate evaluation
- FinMind signal integration

### Phase 3

- YouTube transcript ingestion MVP
- podcast transcript ingestion MVP
- normalized knowledge note outputs

### Phase 4

- external content platform inputs
- transcript-driven long-form knowledge inventory
- campaign / pillar-aware knowledge routing
