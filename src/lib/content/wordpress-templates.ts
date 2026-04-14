export type WordPressTemplateId = "opinion" | "case-study" | "tool-review" | "weekly-recap";

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

export function buildAffiliateSlotBlock(policy: string) {
  return `
<section>
  <h2>推薦工具 / 聯盟連結插槽</h2>
  <p>這裡保留給你放聯盟連結、推廣連結、產品推薦或導購說明。正式發布前可依文章主題替換。</p>
  <ul>
    <li>主推薦工具：待填寫</li>
    <li>備用方案或延伸閱讀：待填寫</li>
    <li>Disclosure / 利益揭露：${policy || "若本文含聯盟連結，請加上合適揭露說明。"}</li>
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
}) {
  const template = getWordPressTemplate(params.templateId);
  const personaBlock = params.personaPrompt
    ? `<blockquote><strong>寫作視角：</strong>${params.personaPrompt}</blockquote>`
    : "";
  const paragraphsHtml = params.paragraphs.map((line) => `<p>${line}</p>`).join("\n");
  const pointsHtml = params.points.map((line) => `<li>${line}</li>`).join("\n");

  return `
<p>這是一篇依照你的既有內容節奏整理出的 WordPress 草稿，先把核心架構與商業插槽留好，方便你直接細修。</p>
${personaBlock}
<h2>${template.introHeading}</h2>
<p>${params.summary.slice(0, 180)}</p>
<h2>${template.bodyHeading}</h2>
${paragraphsHtml}
<h2>${template.insightHeading}</h2>
<ul>
  ${pointsHtml}
</ul>
${buildAffiliateSlotBlock(params.affiliatePolicy)}
<h2>${template.closingHeading}</h2>
<p>${template.ctaLabel}</p>`.trim();
}
