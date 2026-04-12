import { env } from "@/lib/env";

type RewriteInput = {
  title: string;
  rawText: string;
  personaPrompt: string;
  tone: string;
};

type RewriteOutput = {
  provider: "gemini" | "claude" | "fallback";
  summary: string;
  threadsDraft: string;
  wordpressTitle: string;
  wordpressExcerpt: string;
  wordpressHtml: string;
};

function extractTextFromJsonBlock(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("AI response did not include JSON.");
  }

  return JSON.parse(match[0]) as Omit<RewriteOutput, "provider">;
}

function buildPrompt(input: RewriteInput) {
  return [
    "你是一個多平台內容編輯引擎。",
    `Persona: ${input.personaPrompt}`,
    `Tone: ${input.tone}`,
    "請根據輸入素材，輸出 JSON，欄位必須只有：summary, threadsDraft, wordpressTitle, wordpressExcerpt, wordpressHtml。",
    "threadsDraft 必須適合 Threads，500 字以內。",
    "wordpressExcerpt 請控制在 140 字內。",
    "wordpressHtml 請輸出可直接貼入 WordPress 的 HTML 內容。",
    `Title: ${input.title}`,
    `Source: ${input.rawText}`
  ].join("\n");
}

async function runGeminiRewrite(input: RewriteInput): Promise<RewriteOutput> {
  const apiKey = env.geminiApiKey();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
    throw new Error(`Gemini API error (${response.status})`);
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
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
    throw new Error(`Claude API error (${response.status})`);
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

export async function rewriteContentWithAi(input: RewriteInput): Promise<RewriteOutput> {
  try {
    if (env.geminiApiKey()) {
      return await runGeminiRewrite(input);
    }
  } catch {}

  try {
    if (env.anthropicApiKey()) {
      return await runClaudeRewrite(input);
    }
  } catch {}

  throw new Error("No AI provider available");
}
