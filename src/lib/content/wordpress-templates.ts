export type WordPressTemplateId = "opinion" | "case-study" | "tool-review" | "weekly-recap";
export type WordPressDraftContentType = "comparison" | "review" | "tutorial";
export type WordPressDraftPillar = "digital_bank" | "broker" | "beginner_investing";
export type WordPressDraftStage = "discovery" | "comparison" | "decision";

export type WordPressDraftPlanning = {
  contentType: WordPressDraftContentType;
  pillar: WordPressDraftPillar;
  targetStage: WordPressDraftStage;
  primaryCta: string;
  secondaryCta: string;
  internalLinks: string[];
  notesFromLarry: string;
};

export type AffiliateLibrary = {
  primary: string;
  secondary: string;
  disclosure: string;
  cta: string;
};

type WordPressTemplateDefinition = {
  id: WordPressTemplateId;
  label: string;
  description: string;
  introHeading: string;
  bodyHeading: string;
  insightHeading: string;
  closingHeading: string;
  ctaLabel: string;
};

export const WORDPRESS_TEMPLATES: WordPressTemplateDefinition[] = [
  {
    id: "opinion",
    label: "觀點文",
    description: "適合表達立場、拆解趨勢與給出你的判斷。",
    introHeading: "先說觀點",
    bodyHeading: "背景與脈絡",
    insightHeading: "我會怎麼看這件事",
    closingHeading: "最後的行動建議",
    ctaLabel: "如果你也在觀察同一件事，可以從這裡延伸閱讀或採取下一步。"
  },
  {
    id: "case-study",
    label: "案例拆解",
    description: "適合分析品牌、產品、內容操作或成長案例。",
    introHeading: "案例概覽",
    bodyHeading: "拆解過程",
    insightHeading: "值得複製的關鍵",
    closingHeading: "可以直接應用的做法",
    ctaLabel: "如果你想把這種做法套進自己的內容流程，這裡可以放工具與服務推薦。"
  },
  {
    id: "tool-review",
    label: "工具推薦",
    description: "適合導購、使用心得、工具比較與聯盟轉化。",
    introHeading: "這個工具值不值得用",
    bodyHeading: "實際使用感受",
    insightHeading: "適合誰，不適合誰",
    closingHeading: "我的推薦結論",
    ctaLabel: "如果你要直接試用，這裡保留產品連結、聯盟連結與補充說明。"
  },
  {
    id: "weekly-recap",
    label: "週報 Recap",
    description: "適合整理一週觀察、連結、進度與反思。",
    introHeading: "這週重點",
    bodyHeading: "值得記下來的事",
    insightHeading: "延伸觀察",
    closingHeading: "下週可延續的方向",
    ctaLabel: "如果這份 recap 對你有幫助，這裡可以放訂閱、社群或推薦資源。"
  }
];

export function getWordPressTemplate(templateId: string | undefined): WordPressTemplateDefinition {
  return WORDPRESS_TEMPLATES.find((template) => template.id === templateId) ?? WORDPRESS_TEMPLATES[0];
}

function inferPillar(source: string): WordPressDraftPillar {
  const normalized = source.toLowerCase();

  if (
    /數位銀行|銀行帳戶|活存|台幣活存|高利活存|richart|line bank|將來銀行|王道|bank/.test(normalized)
  ) {
    return "digital_bank";
  }

  if (/券商|證券戶|開戶|手續費|複委託|富邦|元大|國泰|證券/.test(normalized)) {
    return "broker";
  }

  return "beginner_investing";
}

function inferContentType(source: string, templateId?: string): WordPressDraftContentType {
  const normalized = source.toLowerCase();

  if (templateId === "tool-review" || /比較|推薦|哪家|手續費|活存|vs|排行/.test(normalized)) {
    return "comparison";
  }

  if (/評價|評測|心得|開箱|使用|適合誰|不適合誰|品牌/.test(normalized)) {
    return "review";
  }

  return "tutorial";
}

function inferStage(contentType: WordPressDraftContentType): WordPressDraftStage {
  if (contentType === "comparison") {
    return "comparison";
  }

  if (contentType === "review") {
    return "decision";
  }

  return "discovery";
}

function buildInternalLinks(
  pillar: WordPressDraftPillar,
  contentType: WordPressDraftContentType,
  targetStage: WordPressDraftStage
) {
  const linkMap: Record<WordPressDraftPillar, string[]> = {
    digital_bank: ["數位銀行推薦總表", "高利活存比較", "指定數位銀行品牌評測"],
    broker: ["券商推薦總表", "券商手續費比較", "指定券商品牌評測"],
    beginner_investing: ["ETF 新手入門", "新手開證券戶流程", "投資常見錯誤整理"]
  };

  const links = [...linkMap[pillar]];

  if (contentType === "tutorial") {
    links.unshift("先看比較頁，再決定品牌");
  }

  if (targetStage === "decision") {
    links.unshift("官方申請前注意事項");
  }

  return Array.from(new Set(links)).slice(0, 3);
}

function labelForPillar(pillar: WordPressDraftPillar) {
  if (pillar === "digital_bank") return "digital_bank / 數位銀行";
  if (pillar === "broker") return "broker / 券商與證券戶";
  return "beginner_investing / ETF 與新手投資";
}

function labelForContentType(contentType: WordPressDraftContentType) {
  if (contentType === "comparison") return "comparison / 比較頁";
  if (contentType === "review") return "review / 品牌評測";
  return "tutorial / 教學與入門";
}

function labelForStage(stage: WordPressDraftStage) {
  if (stage === "comparison") return "comparison / 比較階段";
  if (stage === "decision") return "decision / 決策階段";
  return "discovery / 初步研究";
}

export function inferWordPressDraftPlanning(params: {
  title: string;
  summary: string;
  templateId?: string;
}): WordPressDraftPlanning {
  const source = `${params.title}\n${params.summary}`;
  const pillar = inferPillar(source);
  const contentType = inferContentType(source, params.templateId);
  const targetStage = inferStage(contentType);

  const primaryCta =
    contentType === "comparison"
      ? "導去對應品牌評測或比較總表"
      : contentType === "review"
        ? "導去官方申請或主比較頁"
        : "導回比較頁或整理表";
  const secondaryCta = contentType === "tutorial" ? "下載整理表" : "回主比較頁";

  return {
    contentType,
    pillar,
    targetStage,
    primaryCta,
    secondaryCta,
    internalLinks: buildInternalLinks(pillar, contentType, targetStage),
    notesFromLarry:
      "先讓讀者知道應該先看哪條路，再補比較標準與限制條件；涉及利率、優惠、手續費時提醒資料可能變動。"
  };
}

export function buildAffiliateSlotBlock(policy: string, library?: Partial<AffiliateLibrary>) {
  return `
<section>
  <h2>推薦工具 / 聯盟連結插槽</h2>
  <p>這裡保留給你放聯盟連結、推廣連結、產品推薦或導購說明。正式發布前可依文章主題替換。</p>
  <ul>
    <li>主推薦工具：${library?.primary || "待填寫"}</li>
    <li>備用方案或延伸閱讀：${library?.secondary || "待填寫"}</li>
    <li>Disclosure / 利益揭露：${library?.disclosure || policy || "若本文含聯盟連結，請加上合適揭露說明。"}</li>
  </ul>
  <p>${library?.cta || "這裡可以補一段導購 CTA 或下一步。"}</p>
</section>`.trim();
}

function buildPlanningBlock(planning: WordPressDraftPlanning) {
  return `
<section>
  <h2>編輯規劃</h2>
  <ul>
    <li>文章類型：${labelForContentType(planning.contentType)}</li>
    <li>主軸：${labelForPillar(planning.pillar)}</li>
    <li>讀者階段：${labelForStage(planning.targetStage)}</li>
    <li>主 CTA：${planning.primaryCta}</li>
    <li>次 CTA：${planning.secondaryCta}</li>
    <li>建議內鏈：${planning.internalLinks.join(" / ")}</li>
    <li>編輯備註：${planning.notesFromLarry}</li>
  </ul>
</section>`.trim();
}

export function buildTemplateHtml(params: {
  templateId?: string;
  title: string;
  summary: string;
  paragraphs: string[];
  points: string[];
  affiliatePolicy: string;
  personaPrompt: string;
  affiliateLibrary?: Partial<AffiliateLibrary>;
  planning?: WordPressDraftPlanning;
}) {
  const template = getWordPressTemplate(params.templateId);
  const planning = params.planning ?? inferWordPressDraftPlanning({
    title: params.title,
    summary: params.summary,
    templateId: params.templateId
  });
  const personaBlock = params.personaPrompt
    ? `<blockquote><strong>寫作視角：</strong>${params.personaPrompt}</blockquote>`
    : "";
  const paragraphsHtml = params.paragraphs.map((line) => `<p>${line}</p>`).join("\n");
  const pointsHtml = params.points.map((line) => `<li>${line}</li>`).join("\n");

  return `
<p>這是一篇依照你的既有內容節奏整理出的 WordPress 草稿，先把核心架構與商業插槽留好，方便你直接細修。</p>
${personaBlock}
${buildPlanningBlock(planning)}
<h2>${template.introHeading}</h2>
<p>${params.summary.slice(0, 180)}</p>
<h2>${template.bodyHeading}</h2>
${paragraphsHtml}
<h2>${template.insightHeading}</h2>
<ul>
  ${pointsHtml}
</ul>
${buildAffiliateSlotBlock(params.affiliatePolicy, params.affiliateLibrary)}
<h2>${template.closingHeading}</h2>
<p>${template.ctaLabel}</p>`.trim();
}
