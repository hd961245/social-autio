# LarryChen Editorial System

## 這版做了什麼

這套調整的目標，是讓 `social-autio` 在幫 `larrychen.com.tw` 起 WordPress 草稿時，不再只是通用長文模板，而是先吃進站點記憶，再決定：

- 這篇是比較頁、品牌評測，還是教學 / 入門頁
- 這篇屬於哪個主軸 pillar
- 讀者目前在 discovery / comparison / decision 哪一段
- 最後該把 CTA 收去哪裡

## 現在的兩種記憶來源

### 1. 站台 preset

如果連接的 WordPress 站台網址符合 `larrychen.com.tw`，系統會自動吃進：

- 站點定位
- 寫作規則
- CTA / 聯盟規則
- 預設 affiliate library

這適合先把內容引擎拉到比較像你的站。

### 2. 舊文分析

在 WordPress 頁面按「分析我的舊文」，系統會從既有文章抽出：

- 寫作風格基底
- 聯盟與導購規劃

這適合讓 AI 再更像你過去的寫法。

## 建議工作流

1. 先在 WordPress 頁面按一次「套用站台記憶」
2. 再按「分析我的舊文」
3. 接著用 Content Engine 或 Rewrite From Archive 生成草稿
4. 最後只把 draft 推回 WordPress，人工審後再決定發佈

## 目前會自動補進草稿的資訊

WordPress draft 會傾向補出：

- 編輯規劃區塊
- 文章類型
- pillar
- target stage
- 主 CTA / 次 CTA
- 建議內鏈

同時本地 draft 也會存：

- `categories`
- `tags`
- `topicTag`

方便後面再做 inventory、篩選或自動化。
