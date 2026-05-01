export type HelpTopic = "compose" | "content-engine" | "ai-workflow" | "knowledge-inputs";

export type HelpSection = {
  title: string;
  description: string;
  bullets: string[];
};

export type HelpTopicContent = {
  title: string;
  summary: string;
  sections: HelpSection[];
};

export const helpTopics: Record<HelpTopic, HelpTopicContent> = {
  "ai-workflow": {
    title: "AI 工作流",
    summary: "先用 Content Engine 吃素材，再回 Compose 修稿、排程與發佈。Compose 內建的 AI 起稿則適合快速把一段想法直接變成可編輯草稿。",
    sections: [
      {
        title: "1. 什麼時候用 Content Engine",
        description: "當你手上是外部素材，而不是已經快寫好的文案時，用這裡最順。",
        bullets: [
          "適合貼網址、長文、訪談摘要、截圖素材，一次拆成 Threads + WordPress 草稿。",
          "適合需要先吃素材、保留來源脈絡，再決定發文角度的情境。",
          "生成後會先進草稿，不會直接發出去。"
        ]
      },
      {
        title: "2. 什麼時候直接在 Compose 用 AI 起稿",
        description: "當你已經知道要發哪個帳號、哪個平台，只差一版可編輯文案時，直接在 Compose 會更快。",
        bullets: [
          "Threads：快速起一版 hook、節奏、CTA 都對齊帳號 persona 的短文。",
          "WordPress：快速補標題、摘要、長文骨架，再接著手動細修。",
          "起稿結果會直接灌進目前表單，不會另外再分岔出一頁。"
        ]
      },
      {
        title: "3. 現在的推薦路徑",
        description: "先粗後細，讓 AI 是幫你加速，而不是讓你多切頁。",
        bullets: [
          "來源複雜：Content Engine -> 生成草稿 -> Compose 微調 -> 排程 / 發佈。",
          "想法已成形：Compose -> AI 起稿 -> 微調 -> 排程 / 發佈。",
          "Threads 先發、WordPress 後修：先排 Threads，再把長文留在 WordPress 草稿。"
        ]
      }
    ]
  },
  compose: {
    title: "Compose 發文台",
    summary: "這裡是最後一哩。AI 起稿、手動微調、排程與發佈都在同一頁完成，不再拆成左右兩個工作欄。",
    sections: [
      {
        title: "日常操作",
        description: "大多數情況下只要走這條路。",
        bullets: [
          "先選帳號，系統會帶入這個帳號的人設與可用能力。",
          "需要 AI 幫忙時，直接打開頁內的 AI 起稿工具即可。",
          "Threads 可立即發佈或加入排程；WordPress 只會建立或更新草稿。"
        ]
      },
      {
        title: "排程與穩定性",
        description: "現在排程由 Inngest 跑，不需要手動打 cron API。",
        bullets: [
          "Threads 排程會先存成 scheduled，時間到由背景工作自動發布。",
          "如果排程沒動，先看 Inngest function 與帳號 token 狀態。",
          "WordPress 不走立即公開，避免誤發長文。"
        ]
      },
      {
        title: "畫面整理後的差異",
        description: "功能沒有拿掉，只是把容易擠版的說明區收起來。",
        bullets: [
          "即時預覽、最近草稿、發布紀錄改由獨立的說明與輔助入口承接。",
          "功能頁只保留主要工作區，避免編輯時一直被旁邊資訊推擠。",
          "需要回顧狀態時，可以去 Help Center 或對應工作台。"
        ]
      }
    ]
  },
  "content-engine": {
    title: "Content Engine",
    summary: "這頁專門處理『先吃素材，再拆稿』。它不是發文台，而是 AI 的素材入口。",
    sections: [
      {
        title: "適合什麼素材",
        description: "把外部內容先轉成你的工作底稿。",
        bullets: [
          "網址：文章、Threads 貼文、可公開讀取的頁面。",
          "純文字：訪談、會議筆記、研究摘要、觀察清單。",
          "圖片 / 截圖：搭配說明文字一起丟，保留畫面脈絡。"
        ]
      },
      {
        title: "生成後去哪裡修",
        description: "Content Engine 的任務是拆稿，不是細修。",
        bullets: [
          "Threads 草稿生成後，直接進 Compose 繼續修和排程。",
          "WordPress 草稿生成後，可以先在 Compose 補摘要與 HTML，再進站台細修版型。",
          "最近輸入與草稿保留在下方，方便回頭接續。"
        ]
      },
      {
        title: "怎麼讓 AI 比較穩",
        description: "把 persona 和來源交代清楚，效果會差很多。",
        bullets: [
          "先選對 Threads 帳號，這會決定人格、語氣與 hook 方向。",
          "素材標題不要留空，AI 比較容易抓到主題。",
          "如果網址抓不到全文，系統會退回以連結脈絡重寫，不會整個失敗。"
        ]
      }
    ]
  },
  "knowledge-inputs": {
    title: "知識輸入策略",
    summary:
      "這個平台的知識輸入不是只有 RSS。長期應該分成財經新聞、無 RSS 部落格、YouTube / podcast transcript，以及你自己的筆記來源。",
    sections: [
      {
        title: "1. 財經新聞怎麼接才穩",
        description: "先以文章 / 新聞本體為主，不要把側欄、推薦閱讀和頁腳一起吃進來。",
        bullets: [
          "台股 / 美股 / 宏觀 / ETF 先用 Starter Pack 起手，再慢慢加自己的固定來源。",
          "優先順序是 RSS -> sitemap / 網站模式 -> 單篇文章 URL，不需要一開始就做重爬蟲。",
          "來源進來後先做正文正規化，再交給 AI 起稿，這樣 Threads 候選稿才比較像真的有讀過文章。"
        ]
      },
      {
        title: "2. 沒有 RSS 的部落格怎麼處理",
        description: "不是沒有 RSS 就不能接，而是要換成網站模式處理。",
        bullets: [
          "現在網站模式會先找 feed，再試 sitemap，最後才抓首頁文章連結。",
          "抓下來的重點不是整站內容，而是文章本體；正文抽取會盡量排除導覽、邊欄與推薦區塊。",
          "如果你只想拆某一篇文章，不必先建來源，直接丟單篇 URL 給 AI 起稿也可以。"
        ]
      },
      {
        title: "3. YouTube / podcast 為什麼值得做",
        description: "這條不是即時新聞，而是長期知識沉澱與觀點資料庫。",
        bullets: [
          "策略上建議先吃 transcript / captions，再考慮語音轉文字 fallback。",
          "適合拿來沉澱成：觀點筆記、系列題庫、WordPress 長文底稿、Threads follow-up 素材。",
          "這會是長期輸入層，不一定每天都用，但非常適合做你的自有知識飛輪。"
        ]
      },
      {
        title: "4. 什麼時候該接其他內容平台",
        description: "只有當某個平台真的能穩定提供高品質輸入時才值得接。",
        bullets: [
          "優先評估：Notion、Google Docs、Obsidian / Markdown、newsletter archive。",
          "判斷標準是：能不能穩定輸入原始觀點、研究摘要或可再加工素材。",
          "不要為了 integration 而 integration，重點是讓 AI 有更好的內容可轉成 Threads 和 WordPress 草稿。"
        ]
      }
    ]
  }
};
