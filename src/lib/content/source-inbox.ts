export type SourceInboxScore = {
  threadsScore: number;
  wordpressScore: number;
  commercialScore: number;
  recommendation: "threads-first" | "wordpress-first" | "dual";
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function scoreSourceItem(input: { title: string; excerpt: string; sourceType: string }): SourceInboxScore {
  const text = `${input.title} ${input.excerpt}`.trim();
  const length = text.length;
  const hasNumbers = /\d/.test(text);
  const hasToolIntent = /(工具|software|app|平台|workflow|template|推薦|教學|review|comparison)/i.test(text);
  const hasOpinionIntent = /(為什麼|觀點|趨勢|想法|判斷|其實|你可能|我認為)/.test(text);
  const hasHowToIntent = /(如何|怎麼|步驟|教學|指南|guide|checklist)/i.test(text);

  let threadsScore = 48;
  let wordpressScore = 52;
  let commercialScore = 36;
  const reasons: string[] = [];

  if (length <= 180) {
    threadsScore += 14;
    reasons.push("內容短而集中，適合先拆成 Threads。");
  } else if (length >= 260) {
    wordpressScore += 16;
    reasons.push("內容已有一定資訊量，更適合整理成長文。");
  }

  if (hasNumbers) {
    threadsScore += 6;
    wordpressScore += 4;
    reasons.push("含數字或明確訊號，容易變成 hook 或段落重點。");
  }

  if (hasToolIntent) {
    wordpressScore += 10;
    commercialScore += 22;
    reasons.push("有工具 / 推薦導向，適合保留聯盟連結或 CTA。");
  }

  if (hasOpinionIntent) {
    threadsScore += 12;
    reasons.push("帶觀點或判斷，適合先發 Threads。");
  }

  if (hasHowToIntent) {
    wordpressScore += 12;
    reasons.push("有教學或步驟感，整理成 blog 結構會更完整。");
  }

  if (input.sourceType === "rss") {
    wordpressScore += 6;
  }

  threadsScore = clamp(threadsScore, 0, 100);
  wordpressScore = clamp(wordpressScore, 0, 100);
  commercialScore = clamp(commercialScore, 0, 100);

  const recommendation =
    Math.abs(threadsScore - wordpressScore) <= 8
      ? "dual"
      : threadsScore > wordpressScore
        ? "threads-first"
        : "wordpress-first";

  return {
    threadsScore,
    wordpressScore,
    commercialScore,
    recommendation,
    reasons: reasons.slice(0, 3)
  };
}
