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

type ProviderId = "openai" | "gemini" | "claude";
const AI_PROVIDER_TIMEOUT_MS = 12000;

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
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("AI response did not include JSON.");
  }

  return JSON.parse(match[0]) as Omit<RewriteOutput, "provider">;
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

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
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

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("AI response did not include JSON.");
  }

  return JSON.parse(match[0]) as Omit<WritingProfileOutput, "provider">;
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

async function runOpenAiWritingProfile(input: WritingProfileInput): Promise<WritingProfileOutput> {
  const apiKey = env.openaiApiKey();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
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

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
      errors.push(`${provider}: ${error instanceof Error ? error.message : "unknown error"}`);
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
      errors.push(`${provider}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  throw new Error(errors.length ? `No AI provider available. ${errors.join(" | ")}` : "No AI provider available");
}
