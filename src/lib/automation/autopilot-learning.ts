export type LearnedAutopilotGuide = {
  focus: string;
  hook: string;
  cta: string;
  reason: string;
  nextMove: string;
};

type LearningMetric = {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
};

type LearningPost = {
  text?: string | null;
  title?: string | null;
  metrics?: LearningMetric | null;
};

function getMetricScore(metric?: LearningMetric | null) {
  if (!metric) {
    return 0;
  }

  return metric.views + metric.likes * 12 + metric.replies * 18 + metric.reposts * 22 + metric.quotes * 18 + metric.shares * 20;
}

export function buildAutopilotLearningGuide(input: {
  posts: LearningPost[];
  topicFocus?: string | null;
  topQuery?: string | null;
  personaLabel?: string | null;
}): LearnedAutopilotGuide {
  const bestPost =
    [...input.posts]
      .filter((post) => post.text?.trim() || post.title?.trim())
      .sort((left, right) => getMetricScore(right.metrics) - getMetricScore(left.metrics))[0] ?? null;

  const metric = bestPost?.metrics ?? null;
  const conversationHeavy = metric ? metric.replies + metric.quotes >= metric.reposts + metric.shares : false;
  const highReach = metric ? metric.views >= 300 || metric.reposts + metric.shares >= 6 : false;
  const queryHint = input.topQuery?.trim();

  const focus = queryHint
    ? `把主題往「${queryHint}」這類可承接搜尋需求的題目靠。`
    : input.topicFocus?.trim()
      ? `維持 ${input.topicFocus.trim()}，但優先挑更接近讀者決策與行動的切角。`
      : "優先挑有明確觀點、能讓讀者立刻知道該怎麼看這件事的題目。";

  const hook = conversationHeavy
    ? "Hook 更像真人先丟立場或反直覺句，再補背景，不要先鋪資料。"
    : highReach
      ? "Hook 先講結論與具體判斷，讓人一眼就能帶走重點。"
      : "Hook 要更短、更直接，避免長鋪陳。";

  const cta = conversationHeavy
    ? "CTA 優先用問句或情境選邊，讓留言延續，而不是只叫人收藏。"
    : queryHint
      ? "CTA 優先導向延伸閱讀、長文或下一步行動，讓搜尋流量有承接。"
      : "CTA 保持自然，偏向請讀者分享自己情況或留下疑問。";

  const reason = bestPost
    ? conversationHeavy
      ? `${input.personaLabel || "這條線"} 最近更吃討論型內容，留言與引用訊號比純擴散更強。`
      : highReach
        ? `${input.personaLabel || "這條線"} 最近更吃可快速轉述的結論型內容，擴散訊號較強。`
        : `${input.personaLabel || "這條線"} 最近還在找穩定模式，先強化首屏判斷與主題聚焦。`
    : "目前還沒有足夠的高表現樣本，先用保守的觀點型 Threads 跑資料。";

  const nextMove = queryHint
    ? `下一輪先做可驗證搜尋需求的 Threads，再決定是否沉成 WordPress。`
    : conversationHeavy
      ? "下一輪優先保留討論感，讓系統更積極產出 follow-up 題。"
      : "下一輪優先做更可轉述、更可帶走的結論型內容。";

  return {
    focus,
    hook,
    cta,
    reason,
    nextMove
  };
}

export function buildAutopilotLearningPrompt(guide: LearnedAutopilotGuide) {
  return [
    "最近這條帳號線自動學到的偏好：",
    `- 題目焦點：${guide.focus}`,
    `- Hook 調整：${guide.hook}`,
    `- CTA 調整：${guide.cta}`,
    `- 為什麼：${guide.reason}`,
    `- 下一輪優先：${guide.nextMove}`
  ].join("\n");
}
