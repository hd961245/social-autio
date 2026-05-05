import { env } from "@/lib/env";
import { findEditorialPresetBySiteUrl } from "@/lib/content/editorial-presets";

type RewriteInput = {
  title: string;
  rawText: string;
  personaPrompt: string;
  tone: string;
  siteUrl?: string;
  wordpressTemplate?: "opinion" | "case-study" | "tool-review" | "weekly-recap";
  preferredProvider?: "auto" | "gemini" | "claude" | "openai";
};

type RewriteOutput = {
  provider: "openai" | "gemini" | "claude" | "fallback";
  summary: string;
  threadsDraft: string;
  wordpressTitle: string;
  wordpressExcerpt: string;
  wordpressHtml: string;
};

type WritingProfileInput = {
  samples: Array<{
    title: string;
    excerpt: string;
    content: string;
    url?: string;
  }>;
  preferredProvider?: "auto" | "gemini" | "claude" | "openai";
};

type WritingProfileOutput = {
  provider: "openai" | "gemini" | "claude";
  writingStyleProfile: string;
  affiliateLinkPolicy: string;
};

type ReplyInsightInput = {
  originalText: string;
  replies: Array<{
    username: string;
    text: string;
  }>;
  preferredProvider?: "auto" | "gemini" | "claude" | "openai";
};

type ReplyInsightOutput = {
  provider: "openai" | "gemini" | "claude";
  summary: string;
  tension: string;
  opportunity: string;
  followUpAngle: string;
};

type ProviderId = "openai" | "gemini" | "claude";
const AI_PROVIDER_TIMEOUT_MS = 12000;

function describeProviderError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "unknown error";
  }
}

function getProviderOrder(preferredProvider: RewriteInput["preferredProvider"] | WritingProfileInput["preferredProvider"]) {
  const ordered: ProviderId[] = [];

  if (preferredProvider && preferredProvider !== "auto") {
    ordered.push(preferredProvider);
  }

  for (const provider of ["openai", "gemini", "claude"] as const) {
    if (!ordered.includes(provider)) {
      ordered.push(provider);
    }
  }

  return ordered;
}

function hasProviderKey(provider: ProviderId) {
  if (provider === "openai") return Boolean(env.openaiApiKey());
  if (provider === "gemini") return Boolean(env.geminiApiKey());
  return Boolean(env.anthropicApiKey());
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = AI_PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(`timeout:${timeoutMs}`), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`provider timeout after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractTextFromJsonBlock(raw: string) {
  const parsed = parseLooseJsonObject(raw);

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    threadsDraft: typeof parsed.threadsDraft === "string" ? parsed.threadsDraft.trim() : "",
    wordpressTitle: typeof parsed.wordpressTitle === "string" ? parsed.wordpressTitle.trim() : "",
    wordpressExcerpt: typeof parsed.wordpressExcerpt === "string" ? parsed.wordpressExcerpt.trim() : "",
    wordpressHtml: typeof parsed.wordpressHtml === "string" ? parsed.wordpressHtml.trim() : ""
  };
}

function extractCandidateJson(raw: string) {
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not include JSON.");
  }

  return raw.slice(start, end + 1);
}

function escapeInvalidControlCharsInJson(raw: string) {
  let result = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (escaping) {
      result += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaping = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === "\n") {
        result += "\\n";
        continue;
      }

      if (char === "\r") {
        result += "\\r";
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        continue;
      }
    }

    result += char;
  }

  return result;
}

function parseLooseJsonObject(raw: string) {
  const candidate = extractCandidateJson(raw);

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch (error) {
    const repaired = escapeInvalidControlCharsInJson(candidate);

    try {
      return JSON.parse(repaired) as Record<string, unknown>;
    } catch {
      throw error;
    }
  }
}

function buildPrompt(input: RewriteInput) {
  const preset = findEditorialPresetBySiteUrl(input.siteUrl);

  return [
    "你是一個多平台內容編輯引擎。",
    preset ? `Site preset: ${preset.label}。${preset.summary}` : "",
    `Persona: ${input.personaPrompt}`,
    `Tone: ${input.tone}`,
    `WordPress template: ${input.wordpressTemplate ?? "opinion"}`,
    "請根據輸入素材，輸出 JSON，欄位必須只有：summary, threadsDraft, wordpressTitle, wordpressExcerpt, wordpressHtml。",
    "threadsDraft 必須適合 Threads，500 字以內。",
    "整體文風要像真人在經營自己的帳號，不要像 AI 助手、摘要機或教學機器人。",
    "避免使用『以下是』、『首先 / 其次 / 最後』、『總結來說』這種制式 AI 轉場。",
    "避免過度工整的條列感；允許自然停頓、口語句、個人立場與不那麼完美的節奏。",
    "如果是 Threads，優先寫成像本人會直接發出去的口吻，而不是替別人代筆的公版文案。",
    "wordpressExcerpt 請控制在 140 字內。",
    "wordpressHtml 請輸出可直接貼入 WordPress 的 HTML 內容，而且要像一篇真的可編輯 blog 初稿，不要只有摘要。",
    "wordpressHtml 結構至少包含：開頭導語、2-4 個小標段落、重點條列、結尾觀點或 CTA。",
    "wordpressHtml 必須保留一個明確的聯盟連結 / 推廣連結插槽區塊。",
    "wordpressHtml 開頭前段必須先有一個『編輯規劃』區塊，寫出：文章類型、主軸 pillar、讀者決策階段、主 CTA、次 CTA、建議內鏈。",
    "如果來源是一則社群貼文，請主動補出『為什麼這件事值得注意』與『可執行的下一步』。",
    preset ? `站點規則：\n${preset.planningRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}` : "",
    `Title: ${input.title}`,
    `Source: ${input.rawText}`
  ].join("\n");
}

async function runOpenAiRewrite(input: RewriteInput): Promise<RewriteOutput> {
  const apiKey = env.openaiApiKey();
  const baseUrl = env.openaiBaseUrl().replace(/\/$/, "");
  const model = env.openaiModel();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetchWithTimeout(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(input)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const text =
    data.output_text?.trim() ||
    data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ||
    "";
  const parsed = extractTextFromJsonBlock(text);

  return {
    provider: "openai",
    ...parsed
  };
}

async function runGeminiRewrite(input: RewriteInput): Promise<RewriteOutput> {
  const apiKey = env.geminiApiKey();
  const model = env.geminiModel();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(input) }]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  const parsed = extractTextFromJsonBlock(text);

  return {
    provider: "gemini",
    ...parsed
  };
}

async function runClaudeRewrite(input: RewriteInput): Promise<RewriteOutput> {
  const apiKey = env.anthropicApiKey();

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content?.map((item) => item.text ?? "").join("\n") ?? "";
  const parsed = extractTextFromJsonBlock(text);

  return {
    provider: "claude",
    ...parsed
  };
}

function extractProfileFromJsonBlock(raw: string) {
  const parsed = parseLooseJsonObject(raw);

  return {
    writingStyleProfile: typeof parsed.writingStyleProfile === "string" ? parsed.writingStyleProfile.trim() : "",
    affiliateLinkPolicy: typeof parsed.affiliateLinkPolicy === "string" ? parsed.affiliateLinkPolicy.trim() : ""
  };
}

function extractReplyInsightsFromJsonBlock(raw: string) {
  const parsed = parseLooseJsonObject(raw);

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    tension: typeof parsed.tension === "string" ? parsed.tension.trim() : "",
    opportunity: typeof parsed.opportunity === "string" ? parsed.opportunity.trim() : "",
    followUpAngle: typeof parsed.followUpAngle === "string" ? parsed.followUpAngle.trim() : ""
  };
}

function buildWritingProfilePrompt(input: WritingProfileInput) {
  const samples = input.samples
    .slice(0, 12)
    .map((sample, index) =>
      [
        `# Sample ${index + 1}`,
        `Title: ${sample.title}`,
        `Excerpt: ${sample.excerpt}`,
        `URL: ${sample.url ?? "n/a"}`,
        `Content: ${sample.content}`
      ].join("\n")
    )
    .join("\n\n");

  return [
    "你是一位內容總編輯，正在分析同一位作者的既有文章。",
    "請輸出 JSON，欄位只能有：writingStyleProfile, affiliateLinkPolicy。",
    "writingStyleProfile 要整理成一份可以直接給 AI 使用的寫作風格說明，內容包含：開場方式、段落節奏、語氣、常見轉場、論證方式、結尾習慣、適合的標題風格、不要偏離的寫法。",
    "affiliateLinkPolicy 要整理成這位作者在聯盟連結、推廣連結、CTA、導購段落上的使用規劃。若樣本沒有明確聯盟連結，也要產出一份保守但可執行的規劃，原則是保留商業導向但不要太硬。",
    "兩個欄位都請用繁體中文，寫成可直接拿來約束後續草稿生成的實用指令。",
    samples
  ].join("\n\n");
}

function buildReplyInsightPrompt(input: ReplyInsightInput) {
  const replyBlock = input.replies
    .slice(0, 10)
    .map((reply, index) => `${index + 1}. @${reply.username}: ${reply.text}`)
    .join("\n");

  return [
    "你是一位內容策略編輯，正在閱讀一篇 Threads 貼文底下的留言。",
    "請輸出 JSON，欄位只能有：summary, tension, opportunity, followUpAngle。",
    "summary：用 2-3 句整理這波留言的主要訊號。",
    "tension：指出留言裡最核心的分歧、疑問或阻力。",
    "opportunity：指出最值得延伸成下一篇內容的切口。",
    "followUpAngle：直接寫一句下一篇 Threads 最適合怎麼切進去。",
    "全部用繁體中文，務必簡潔、可操作。",
    "",
    "原始 Threads：",
    input.originalText,
    "",
    "留言樣本：",
    replyBlock
  ].join("\n");
}

async function runOpenAiWritingProfile(input: WritingProfileInput): Promise<WritingProfileOutput> {
  const apiKey = env.openaiApiKey();
  const baseUrl = env.openaiBaseUrl().replace(/\/$/, "");
  const model = env.openaiModel();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetchWithTimeout(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: buildWritingProfilePrompt(input)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const text =
    data.output_text?.trim() ||
    data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ||
    "";
  const parsed = extractProfileFromJsonBlock(text);

  return {
    provider: "openai",
    ...parsed
  };
}

async function runGeminiWritingProfile(input: WritingProfileInput): Promise<WritingProfileOutput> {
  const apiKey = env.geminiApiKey();
  const model = env.geminiModel();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildWritingProfilePrompt(input) }]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  const parsed = extractProfileFromJsonBlock(text);

  return {
    provider: "gemini",
    ...parsed
  };
}

async function runClaudeWritingProfile(input: WritingProfileInput): Promise<WritingProfileOutput> {
  const apiKey = env.anthropicApiKey();

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1600,
      messages: [
        {
          role: "user",
          content: buildWritingProfilePrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content?.map((item) => item.text ?? "").join("\n") ?? "";
  const parsed = extractProfileFromJsonBlock(text);

  return {
    provider: "claude",
    ...parsed
  };
}

async function runOpenAiReplyInsights(input: ReplyInsightInput): Promise<ReplyInsightOutput> {
  const apiKey = env.openaiApiKey();
  const baseUrl = env.openaiBaseUrl().replace(/\/$/, "");
  const model = env.openaiModel();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetchWithTimeout(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: buildReplyInsightPrompt(input)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const text =
    data.output_text?.trim() ||
    data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ||
    "";
  const parsed = extractReplyInsightsFromJsonBlock(text);

  return {
    provider: "openai",
    ...parsed
  };
}

async function runGeminiReplyInsights(input: ReplyInsightInput): Promise<ReplyInsightOutput> {
  const apiKey = env.geminiApiKey();
  const model = env.geminiModel();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildReplyInsightPrompt(input) }]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  const parsed = extractReplyInsightsFromJsonBlock(text);

  return {
    provider: "gemini",
    ...parsed
  };
}

async function runClaudeReplyInsights(input: ReplyInsightInput): Promise<ReplyInsightOutput> {
  const apiKey = env.anthropicApiKey();

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: buildReplyInsightPrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content?.map((item) => item.text ?? "").join("\n") ?? "";
  const parsed = extractReplyInsightsFromJsonBlock(text);

  return {
    provider: "claude",
    ...parsed
  };
}

export async function rewriteContentWithAi(input: RewriteInput): Promise<RewriteOutput> {
  const errors: string[] = [];

  for (const provider of getProviderOrder(input.preferredProvider ?? "auto")) {
    if (!hasProviderKey(provider)) {
      errors.push(`${provider}: missing api key`);
      continue;
    }

    try {
      if (provider === "openai") {
        return await runOpenAiRewrite(input);
      }

      if (provider === "gemini") {
        return await runGeminiRewrite(input);
      }

      return await runClaudeRewrite(input);
    } catch (error) {
      errors.push(`${provider}: ${describeProviderError(error)}`);
    }
  }

  throw new Error(errors.length ? `No AI provider available. ${errors.join(" | ")}` : "No AI provider available");
}

export async function generateWritingProfileWithAi(input: WritingProfileInput): Promise<WritingProfileOutput> {
  const errors: string[] = [];

  for (const provider of getProviderOrder(input.preferredProvider ?? "auto")) {
    if (!hasProviderKey(provider)) {
      errors.push(`${provider}: missing api key`);
      continue;
    }

    try {
      if (provider === "openai") {
        return await runOpenAiWritingProfile(input);
      }

      if (provider === "gemini") {
        return await runGeminiWritingProfile(input);
      }

      return await runClaudeWritingProfile(input);
    } catch (error) {
      errors.push(`${provider}: ${describeProviderError(error)}`);
    }
  }

  throw new Error(errors.length ? `No AI provider available. ${errors.join(" | ")}` : "No AI provider available");
}

export async function summarizeReplyInsightsWithAi(input: ReplyInsightInput): Promise<ReplyInsightOutput> {
  const errors: string[] = [];

  for (const provider of getProviderOrder(input.preferredProvider ?? "auto")) {
    if (!hasProviderKey(provider)) {
      errors.push(`${provider}: missing api key`);
      continue;
    }

    try {
      if (provider === "openai") {
        return await runOpenAiReplyInsights(input);
      }

      if (provider === "gemini") {
        return await runGeminiReplyInsights(input);
      }

      return await runClaudeReplyInsights(input);
    } catch (error) {
      errors.push(`${provider}: ${describeProviderError(error)}`);
    }
  }

  throw new Error(errors.length ? `No AI provider available. ${errors.join(" | ")}` : "No AI provider available");
}
