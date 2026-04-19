# Crawler Stack

這份是目前 `Sources / Inbox / Content Engine` 推進時，建議搭配的爬文工具選型。

## 優先順序

1. `RSS / Atom` 優先  
   能用 feed 就不要硬爬 HTML。現在站內 `Source Watchlist` 已原生支援 RSS。

2. `RSSHub` 補沒有 feed 的來源  
   適合把部分新聞站、論壇、專欄頁先轉成 RSS，再餵進站內日更來源池。  
   Repo: [DIYgod/RSSHub](https://github.com/DIYgod/RSSHub)

3. `Firecrawl` 做 URL 擷取與困難頁面備援  
   適合把單篇文章轉成 markdown / 結構化內容，尤其是要給 AI 重寫時。  
   Repo: [firecrawl/firecrawl](https://github.com/mendableai/firecrawl)

4. `news-please` 做大量新聞站抽取  
   適合未來如果你要做更完整的新聞站批量收集、歷史文章抽取、CLI crawler。  
   Repo: [fhamborg/news-please](https://github.com/fhamborg/news-please)

## 目前專案怎麼用

- 日常來源追蹤：直接用 `RSS` 或 `RSSHub` feed 丟進 `Sources`
- 單篇網址吃內容：走站內 `Content Engine`
- 每天固定匯入：打開來源上的 `daily auto-import`
- 寫稿參照：先看 `Desk / Inbox` 進來的來源，再交給 AI 起稿或改寫

## 建議來源型態

- 科技 / 創業媒體：優先找官方 RSS
- 沒有 RSS 的欄位頁：先找 RSSHub 對應路由
- 要抓很難處理的單篇頁面：再考慮 Firecrawl
- 想做比較大規模的新聞資料庫：才考慮 news-please
