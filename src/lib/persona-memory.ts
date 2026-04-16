type PublishedThreadSample = {
  id: string;
  accountId: string;
  text: string;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
  views: number;
};

export type PersonaMemory = {
  accountId: string;
  topOpeners: string[];
  topClosers: string[];
  patternNote: string;
  recommendedMove: string;
};

function uniqueTrimmed(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function firstSentence(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean)
    ?.split(/(?<=[。！？.!?])/)[0]
    ?.trim() ?? "";
}

function lastSentence(text: string) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const lastLine = lines.at(-1) ?? "";
  const sentence = lastLine.split(/(?<=[。！？.!?])/).filter(Boolean).at(-1)?.trim() ?? lastLine;
  return sentence;
}

function scorePost(sample: PublishedThreadSample) {
  return sample.views + sample.likes * 8 + sample.replies * 12 + sample.reposts * 14 + sample.quotes * 14 + sample.shares * 16;
}

export function buildPersonaMemories(samples: PublishedThreadSample[]): Record<string, PersonaMemory> {
  const grouped = samples.reduce<Record<string, PublishedThreadSample[]>>((acc, sample) => {
    acc[sample.accountId] ??= [];
    acc[sample.accountId].push(sample);
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(grouped).map(([accountId, accountSamples]) => {
      const ranked = [...accountSamples].sort((a, b) => scorePost(b) - scorePost(a));
      const openers = uniqueTrimmed(ranked.map((sample) => firstSentence(sample.text))).slice(0, 3);
      const closers = uniqueTrimmed(ranked.map((sample) => lastSentence(sample.text))).slice(0, 3);
      const avgLength =
        accountSamples.length > 0
          ? Math.round(accountSamples.reduce((sum, sample) => sum + sample.text.trim().length, 0) / accountSamples.length)
          : 0;
      const replyHeavyCount = accountSamples.filter((sample) => {
        const views = sample.views || 1;
        return (sample.replies + sample.quotes) / views >= 0.025;
      }).length;
      const amplificationCount = accountSamples.filter((sample) => {
        const views = sample.views || 1;
        return (sample.reposts + sample.quotes + sample.shares) / views >= 0.02;
      }).length;

      let patternNote = `這個帳號最近較常吃到 ${avgLength >= 180 ? "中長型觀點文" : "短而直白的切句"}。`;
      if (replyHeavyCount >= Math.max(2, Math.ceil(accountSamples.length / 3))) {
        patternNote = "這個帳號更容易吃到能引發回覆與引用的觀點句，適合留下討論空間。";
      } else if (amplificationCount >= Math.max(2, Math.ceil(accountSamples.length / 3))) {
        patternNote = "這個帳號更容易吃到可轉發的摘要句，適合做俐落結論與可複述觀點。";
      }

      const recommendedMove =
        replyHeavyCount > amplificationCount
          ? "先把第一句寫得更有立場，結尾留一個讓人想回的問句。"
          : amplificationCount > 0
            ? "優先寫可被轉述的結論句，結尾保持乾淨，不要塞太多資訊。"
            : "先用明確 hook 開頭，再補一個夠乾脆的 CTA，讓訊號更集中。";

      return [
        accountId,
        {
          accountId,
          topOpeners: openers,
          topClosers: closers,
          patternNote,
          recommendedMove
        }
      ];
    })
  );
}
