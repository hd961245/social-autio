export type MissionContext = {
  title?: string | null;
  goal?: string | null;
  direction?: string | null;
  unit?: string | null;
  currentValue?: number | null;
  targetValue?: number | null;
};

type MissionSignals = {
  focusTraffic: boolean;
  focusSearch: boolean;
  focusAuthority: boolean;
  focusConversation: boolean;
  focusConversion: boolean;
  focusKnowledge: boolean;
  urgency: "high" | "medium" | "low";
  keywordTokens: string[];
};

function tokenize(text: string) {
  return Array.from(
    new Set(
      (text.match(/[A-Za-z]{3,}|[\u4e00-\u9fff]{2,}/g) ?? [])
        .map((token) => token.toLowerCase())
        .filter((token) => token.length >= 2)
    )
  );
}

function buildMissionText(mission?: MissionContext | null) {
  return [mission?.title, mission?.goal, mission?.direction, mission?.unit].filter(Boolean).join(" ").toLowerCase();
}

export function deriveMissionSignals(mission?: MissionContext | null): MissionSignals {
  const text = buildMissionText(mission);
  const keywordTokens = tokenize(text).slice(0, 12);
  const focusTraffic = /(流量|月流量|觸達|曝光|放大|top|前50|前五十|成長|reach|traffic)/i.test(text);
  const focusSearch = /(搜尋|seo|search console|gsc|關鍵字|自然流量|ranking|排名)/i.test(text);
  const focusAuthority = /(權威|研究|一手|深度|專業|拆解|analysis|authority)/i.test(text);
  const focusConversation = /(留言|討論|互動|conversation|community|engagement)/i.test(text);
  const focusConversion = /(轉介|轉化|cta|聯盟|affiliate|訂閱|名單|導流)/i.test(text);
  const focusKnowledge = /(知識|沉澱|長文|wordpress|教學|指南|資料庫|archive)/i.test(text);

  const progressRatio =
    mission?.targetValue && mission.targetValue > 0
      ? Math.min(1, Math.max(0, (mission.currentValue ?? 0) / mission.targetValue))
      : 0;
  const urgency = progressRatio < 0.35 ? "high" : progressRatio < 0.7 ? "medium" : "low";

  return {
    focusTraffic,
    focusSearch,
    focusAuthority,
    focusConversation,
    focusConversion,
    focusKnowledge,
    urgency,
    keywordTokens
  };
}

export function getMissionKeywordOverlapScore(text: string, mission?: MissionContext | null) {
  const normalized = text.toLowerCase();
  const signals = deriveMissionSignals(mission);
  const overlap = signals.keywordTokens.filter((token) => normalized.includes(token));

  return {
    score: Math.min(12, overlap.length * 2),
    overlap
  };
}

export function applyMissionToSourceScores(input: {
  mission?: MissionContext | null;
  title: string;
  excerpt: string;
  threadsScore: number;
  wordpressScore: number;
  commercialScore: number;
  reasons: string[];
}) {
  const signals = deriveMissionSignals(input.mission);
  const text = `${input.title} ${input.excerpt}`.trim();
  const overlap = getMissionKeywordOverlapScore(text, input.mission);

  let threadsScore = input.threadsScore;
  let wordpressScore = input.wordpressScore;
  let commercialScore = input.commercialScore;
  const reasons = [...input.reasons];

  if (signals.focusTraffic) {
    threadsScore += signals.urgency === "high" ? 12 : 8;
    reasons.push("目前 mission 偏流量放大，系統更偏向先做 Threads。");
  }

  if (signals.focusSearch || signals.focusKnowledge) {
    wordpressScore += signals.urgency === "high" ? 14 : 10;
    reasons.push("目前 mission 偏搜尋 / 知識沉澱，系統提高長文優先度。");
  }

  if (signals.focusAuthority) {
    wordpressScore += 8;
    threadsScore += 4;
  }

  if (signals.focusConversation) {
    threadsScore += 8;
  }

  if (signals.focusConversion) {
    commercialScore += 12;
    wordpressScore += 4;
    reasons.push("目前 mission 偏轉化承接，系統提高 CTA / 商業潛力權重。");
  }

  if (overlap.score > 0) {
    threadsScore += Math.round(overlap.score * 0.6);
    wordpressScore += Math.round(overlap.score * 0.8);
    commercialScore += Math.round(overlap.score * 0.4);
    reasons.push(`這篇來源和 mission 關鍵詞更接近：${overlap.overlap.slice(0, 3).join(" / ")}`);
  }

  return {
    threadsScore,
    wordpressScore,
    commercialScore,
    reasons: reasons.slice(0, 4)
  };
}

export function getMissionDraftBoost(input: {
  mission?: MissionContext | null;
  title?: string | null;
  text?: string | null;
  topicTag?: string | null;
  excerpt?: string | null;
}) {
  const signals = deriveMissionSignals(input.mission);
  const combined = `${input.title ?? ""} ${input.text ?? ""} ${input.excerpt ?? ""}`;
  const overlap = getMissionKeywordOverlapScore(combined, input.mission);
  let scoreDelta = 0;

  if (signals.focusTraffic && (input.topicTag === "news" || input.topicTag === "opinion")) scoreDelta += 8;
  if ((signals.focusSearch || signals.focusKnowledge) && input.topicTag === "howto") scoreDelta += 10;
  if (signals.focusConversation && input.topicTag === "opinion") scoreDelta += 6;
  if (signals.focusConversion && /(工具|推薦|流程|平台|清單|比較)/i.test(combined)) scoreDelta += 8;
  scoreDelta += overlap.score;

  return {
    scoreDelta,
    overlap: overlap.overlap
  };
}

export function getMissionLongformBoost(input: {
  mission?: MissionContext | null;
  text: string;
  views: number;
  replies: number;
}) {
  const signals = deriveMissionSignals(input.mission);
  const overlap = getMissionKeywordOverlapScore(input.text, input.mission);
  let scoreDelta = 0;
  let eligibleBias = 0;

  if (signals.focusSearch || signals.focusKnowledge) {
    scoreDelta += 18;
    eligibleBias += 1;
  }

  if (signals.focusAuthority) {
    scoreDelta += 10;
    eligibleBias += 1;
  }

  if (signals.focusConversion) {
    scoreDelta += 6;
  }

  if (input.replies >= 6 && signals.focusConversation) {
    scoreDelta += 6;
  }

  scoreDelta += overlap.score;
  if (overlap.score >= 6) {
    eligibleBias += 1;
  }

  return {
    scoreDelta,
    eligibleBias,
    overlap: overlap.overlap
  };
}

export function getMissionOptimizationBoost(input: {
  mission?: MissionContext | null;
  text: string;
  replies: number;
}) {
  const signals = deriveMissionSignals(input.mission);
  const overlap = getMissionKeywordOverlapScore(input.text, input.mission);
  let scoreDelta = overlap.score;

  if (signals.focusTraffic) scoreDelta += 4;
  if (signals.focusConversation && input.replies > 0) scoreDelta += 6;
  if (signals.focusSearch || signals.focusKnowledge) scoreDelta += 4;

  return {
    scoreDelta,
    overlap: overlap.overlap
  };
}
