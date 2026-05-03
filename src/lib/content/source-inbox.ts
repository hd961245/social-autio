import { applyMissionToSourceScores, type MissionContext } from "@/lib/mission-scoring";

export type SourceInboxScore = {
  threadsScore: number;
  wordpressScore: number;
  commercialScore: number;
  qualityTier: "high" | "watch" | "low";
  qualityLabel: string;
  recommendation: "threads-first" | "wordpress-first" | "dual";
  reasons: string[];
  memoryNote?: string;
};

export type SourceKnowledgeLane = {
  lane: "news-fast" | "deep-dive" | "knowledge-bank";
  label: "快節奏快評" | "深度拆解" | "長期沉澱";
  instruction: string;
};

export type PersonaRoutingCandidate = {
  id: string;
  username: string;
  personaLabel?: string;
  personaPrompt?: string;
  defaultTone?: string;
  topicFocus?: string;
  hookStyle?: string;
  ctaStyle?: string;
  voiceGuardrails?: string;
};

export type PersonaRoutingResult = {
  accountId: string;
  label: string;
  reason: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMemoryBias(input: {
  importCount?: number;
  skipCount?: number;
  threadsPickCount?: number;
  wordpressPickCount?: number;
}) {
  const importCount = input.importCount ?? 0;
  const skipCount = input.skipCount ?? 0;
  const threadsPickCount = input.threadsPickCount ?? 0;
  const wordpressPickCount = input.wordpressPickCount ?? 0;

  if (importCount >= 3 && importCount > skipCount) {
    if (threadsPickCount >= wordpressPickCount + 2) {
      return {
        threadsBias: 14,
        wordpressBias: 0,
        commercialBias: 8,
        note: "你過去更常把這類來源先拆成 Threads，系統把推薦往短內容推。"
      };
    }

    if (wordpressPickCount >= threadsPickCount + 2) {
      return {
        threadsBias: 0,
        wordpressBias: 14,
        commercialBias: 10,
        note: "你過去更常把這類來源沉成長文，系統把推薦往 WordPress 推。"
      };
    }

    return {
      threadsBias: 4,
      wordpressBias: 6,
      commercialBias: 12,
      note: "你過去常把這類來源拿來改寫，系統提高了優先度。"
    };
  }

  if (skipCount >= 3 && skipCount >= importCount) {
    return {
      threadsBias: -4,
      wordpressBias: -4,
      commercialBias: -6,
      note: "你過去常略過這類來源，系統先保守看待。"
    };
  }

  return {
    threadsBias: 0,
    wordpressBias: 0,
    commercialBias: 0,
    note: undefined
  };
}

export function scoreSourceItem(input: {
  title: string;
  excerpt: string;
  sourceType: string;
  importCount?: number;
  skipCount?: number;
  threadsPickCount?: number;
  wordpressPickCount?: number;
  mission?: MissionContext | null;
}): SourceInboxScore {
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
  const memory = getMemoryBias({
    importCount: input.importCount,
    skipCount: input.skipCount,
    threadsPickCount: input.threadsPickCount,
    wordpressPickCount: input.wordpressPickCount
  });

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

  threadsScore += memory.threadsBias;
  wordpressScore += memory.wordpressBias;
  commercialScore += memory.commercialBias;

  const missionAdjusted = applyMissionToSourceScores({
    mission: input.mission,
    title: input.title,
    excerpt: input.excerpt,
    threadsScore,
    wordpressScore,
    commercialScore,
    reasons
  });

  threadsScore = missionAdjusted.threadsScore;
  wordpressScore = missionAdjusted.wordpressScore;
  commercialScore = missionAdjusted.commercialScore;
  const enrichedReasons = missionAdjusted.reasons;

  threadsScore = clamp(threadsScore, 0, 100);
  wordpressScore = clamp(wordpressScore, 0, 100);
  commercialScore = clamp(commercialScore, 0, 100);

  const recommendation =
    Math.abs(threadsScore - wordpressScore) <= 8
      ? "dual"
      : threadsScore > wordpressScore
        ? "threads-first"
        : "wordpress-first";

  const strongestSignal = Math.max(threadsScore, wordpressScore, commercialScore);
  const qualityTier =
    strongestSignal >= 74 || (recommendation !== "dual" && strongestSignal >= 68)
      ? "high"
      : strongestSignal >= 56
        ? "watch"
        : "low";
  const qualityLabel =
    qualityTier === "high" ? "高可寫" : qualityTier === "watch" ? "可觀察" : "低訊號";

  return {
    threadsScore,
    wordpressScore,
    commercialScore,
    qualityTier,
    qualityLabel,
    recommendation,
    reasons: enrichedReasons.slice(0, 3),
    memoryNote: memory.note
  };
}

export function classifySourceKnowledgeLane(input: {
  title: string;
  excerpt: string;
  sourceType: string;
  preferredOutcome?: string | null;
}) : SourceKnowledgeLane {
  const text = `${input.title} ${input.excerpt}`.toLowerCase();
  const hasHowTo = /(如何|怎麼|教學|指南|懶人包|步驟|攻略|guide|checklist)/i.test(text);
  const hasPerspective = /(為什麼|其實|我認為|觀點|你會發現|重點不是|真正的問題|拆解)/i.test(text);
  const hasSignal = /(最新|快訊|公布|升息|降息|財報|盤中|收盤|headline|breaking|市場|台股|美股|利率)/i.test(text);

  if (input.preferredOutcome === "wordpress" || hasHowTo) {
    return {
      lane: "knowledge-bank",
      label: "長期沉澱",
      instruction: "這類來源更適合整理成可反覆引用的知識型內容，先抓框架、步驟或可教學的部分。"
    };
  }

  if (input.sourceType === "site" || hasPerspective) {
    return {
      lane: "deep-dive",
      label: "深度拆解",
      instruction: "這類來源適合先抽正文主體，再轉成有觀點、有拆解感的 Threads 或長文底稿。"
    };
  }

  if (hasSignal || input.sourceType === "rss") {
    return {
      lane: "news-fast",
      label: "快節奏快評",
      instruction: "這類來源適合做快速結論、情境判斷或市場快評，第一句要直接給觀點。"
    };
  }

  return {
    lane: "deep-dive",
    label: "深度拆解",
    instruction: "這類來源先當作可延伸的觀點素材處理，避免寫成空泛快訊。"
  };
}

function tokenizeProfile(text: string) {
  return Array.from(
    new Set(
      (text.match(/[A-Za-z]{4,}|[\u4e00-\u9fff]{2,}/g) ?? [])
        .map((token) => token.toLowerCase())
        .filter((token) => token.length >= 2)
    )
  );
}

function countKeywordMatches(text: string, pattern: RegExp) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

export function routeSourceToPersona(input: {
  title: string;
  excerpt: string;
  accounts: PersonaRoutingCandidate[];
}): PersonaRoutingResult | null {
  if (!input.accounts.length) {
    return null;
  }

  const sourceText = `${input.title} ${input.excerpt}`.toLowerCase();
  const ranked = input.accounts
    .map((account, index) => {
      const profileText = `${account.personaLabel ?? ""} ${account.personaPrompt ?? ""} ${account.defaultTone ?? ""} ${account.topicFocus ?? ""} ${account.hookStyle ?? ""} ${account.ctaStyle ?? ""}`;
      const tokens = tokenizeProfile(profileText);
      const overlap = tokens.filter((token) => sourceText.includes(token));
      const topicBias = countKeywordMatches(sourceText, /(工具|workflow|教學|指南|checklist|步驟|review|comparison|觀點|趨勢|創業|營運|商業|產品|growth|founder)/gi);
      const focusOverlap = tokenizeProfile(account.topicFocus ?? "").filter((token) => sourceText.includes(token));
      const hookOverlap = tokenizeProfile(account.hookStyle ?? "").filter((token) => sourceText.includes(token));
      const ctaOverlap = tokenizeProfile(account.ctaStyle ?? "").filter((token) => sourceText.includes(token));
      const guardrailPenaltyTokens = tokenizeProfile(account.voiceGuardrails ?? "").filter((token) => sourceText.includes(token));
      const starterBias =
        account.defaultTone?.includes("founder") || account.personaLabel?.includes("創業")
          ? /(創業|商業|產品|營運|策略|growth|founder)/i.test(sourceText)
            ? 3
            : 0
          : account.defaultTone?.includes("mystic") || account.personaLabel?.includes("觀察")
            ? /(趨勢|觀點|洞察|why|signal|觀察)/i.test(sourceText)
              ? 3
              : 0
            : /(工具|教學|workflow|checklist|步驟)/i.test(sourceText)
              ? 2
              : 0;

      return {
        account,
        score:
          overlap.length * 2 +
          focusOverlap.length * 2.4 +
          hookOverlap.length * 1.3 +
          ctaOverlap.length * 1.1 +
          Math.min(topicBias, 3) * 0.4 +
          starterBias -
          guardrailPenaltyTokens.length * 1.2 -
          index * 0.05,
        overlap: [...overlap, ...focusOverlap, ...hookOverlap, ...ctaOverlap]
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) {
    return null;
  }

  return {
    accountId: best.account.id,
    label: `${best.account.username}${best.account.personaLabel ? ` · ${best.account.personaLabel}` : ""}`,
    reason:
      best.overlap.length > 0
        ? `這篇來源和這個 persona 的關鍵詞更接近：${best.overlap.slice(0, 3).join(" / ")}`
        : "這篇來源目前先配給預設最接近的 Threads persona。"
  };
}
