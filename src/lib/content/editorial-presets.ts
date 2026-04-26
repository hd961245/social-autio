export type EditorialPreset = {
  id: string;
  label: string;
  siteMatchers: string[];
  summary: string;
  defaultTone: string;
  globalPersonaPrompt: string;
  writingStyleProfile: string;
  affiliateLinkPolicy: string;
  affiliateLibrary: {
    primary: string;
    secondary: string;
    disclosure: string;
    cta: string;
  };
  planningRules: string[];
};

const LARRYCHEN_PRESET: EditorialPreset = {
  id: "larrychen-finance-notes",
  label: "LarryChen Finance Notes",
  siteMatchers: ["larrychen.com.tw", "www.larrychen.com.tw"],
  summary: "理財與券商決策站，核心在幫新手先選路線，再縮小到適合的品牌與下一步。",
  defaultTone: "clear-guide",
  globalPersonaPrompt:
    "你不是新聞站編輯，也不是泛理財雜談作者。你是幫新手排決策順序的內容編輯，會先給結論、再給比較框架、最後導去正確的下一步。",
  writingStyleProfile: [
    "文章先回答『現在該先看什麼』，不要把背景鋪得太長。",
    "開頭要直接點出讀者情境，例如：如果你是要找數位銀行、券商，或剛開始接觸 ETF，先看哪條路。",
    "段落節奏以 2 到 4 句為主，避免大段空泛鋪陳。",
    "比較文要有明確比較標準，品牌文要寫適合誰 / 不適合誰，教學文要補常見錯誤與下一步。",
    "不要用內容農場標題，不要假裝所有資料都是永久固定，遇到利率、手續費、優惠要提醒可能變動。"
  ].join("\n"),
  affiliateLinkPolicy: [
    "CTA 只保留一個主動作，最多再補一個次動作，避免互相搶。",
    "比較頁主 CTA 優先導向品牌評測或整理表；品牌評測頁主 CTA 才導向官方申請；教學頁優先導回比較頁。",
    "聯盟揭露保持清楚但不要太重，讓它像編輯備註而不是硬廣告。",
    "推薦段落要說明適合誰、不適合誰，不只丟連結。"
  ].join("\n"),
  affiliateLibrary: {
    primary: "主推薦：放最適合當前決策階段的品牌評測或官方申請入口",
    secondary: "次推薦：放比較頁、替代方案，或下載整理表",
    disclosure: "若本文含聯盟連結或合作導流，請於推薦段落前後加入清楚揭露。",
    cta: "先看比較，再決定要不要申請；如果你還沒確定，就先拿整理表。"
  },
  planningRules: [
    "先判斷這篇是比較頁、品牌評測，還是教學 / 入門頁。",
    "每篇都要標出主軸 pillar：digital_bank、broker、beginner_investing。",
    "每篇都要標出讀者決策階段：discovery、comparison、decision。",
    "結尾要收回單一主 CTA，並附 2 到 3 個合理內鏈方向。"
  ]
};

export const EDITORIAL_PRESETS: EditorialPreset[] = [LARRYCHEN_PRESET];

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
}

export function findEditorialPresetBySiteUrl(siteUrl?: string | null) {
  if (!siteUrl?.trim()) {
    return null;
  }

  const normalized = normalizeSiteUrl(siteUrl);
  return (
    EDITORIAL_PRESETS.find((preset) =>
      preset.siteMatchers.some((matcher) => normalized.includes(normalizeSiteUrl(matcher)))
    ) ?? null
  );
}

export function buildEditorialMemoryPrompt(params: {
  siteUrl?: string | null;
  globalPersonaPrompt?: string | null;
  writingStyleProfile?: string | null;
  affiliateLinkPolicy?: string | null;
  concise?: boolean;
}) {
  const preset = findEditorialPresetBySiteUrl(params.siteUrl);
  const limit = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
  const concise = Boolean(params.concise);

  return [
    preset ? `站點記憶：${preset.label}。${limit(preset.summary, concise ? 90 : 220)}` : "",
    preset?.globalPersonaPrompt ? limit(preset.globalPersonaPrompt, concise ? 120 : 260) : "",
    params.globalPersonaPrompt?.trim() ? limit(params.globalPersonaPrompt.trim(), concise ? 120 : 260) : "",
    preset?.writingStyleProfile
      ? `站點寫作規則：\n${limit(preset.writingStyleProfile, concise ? 180 : 420)}`
      : "",
    params.writingStyleProfile?.trim()
      ? `寫作風格基底：${limit(params.writingStyleProfile.trim(), concise ? 180 : 420)}`
      : "",
    concise ? "" : preset?.affiliateLinkPolicy ? `站點 CTA / 聯盟規則：\n${limit(preset.affiliateLinkPolicy, 320)}` : "",
    concise ? "" : params.affiliateLinkPolicy?.trim() ? `聯盟與推廣連結策略：${limit(params.affiliateLinkPolicy.trim(), 320)}` : "",
    preset ? `起稿前規劃：\n${preset.planningRules.slice(0, concise ? 2 : preset.planningRules.length).map((rule, index) => `${index + 1}. ${rule}`).join("\n")}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}
