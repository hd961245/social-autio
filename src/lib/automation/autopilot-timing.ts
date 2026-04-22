const AUTOPILOT_UTC_OFFSET_HOURS = 8;
const AUTOPILOT_TIMEZONE = "Asia/Taipei";

type HourBucket = {
  hour: number;
  count: number;
  score: number;
};

function getDatePartsInTimezone(date: Date, timeZone = AUTOPILOT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute")
  };
}

function addOneDay(parts: { year: number; month: number; day: number }) {
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0));
  utcDate.setUTCDate(utcDate.getUTCDate() + 1);

  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate()
  };
}

export function inferBestScheduleTime(input: {
  now?: Date;
  goal?: string | null;
  posts: Array<{
    publishedAt: Date | null;
    metrics: Array<{
      views: number;
      likes: number;
      replies: number;
      reposts: number;
      quotes: number;
      shares: number;
    }>;
  }>;
}) {
  const now = input.now ?? new Date();
  const buckets = new Map<number, HourBucket>();

  for (const post of input.posts) {
    if (!post.publishedAt) {
      continue;
    }

    const latestMetric = post.metrics[0];
    if (!latestMetric) {
      continue;
    }

    const hour = getDatePartsInTimezone(post.publishedAt).hour;
    const weightedScore =
      latestMetric.views +
      latestMetric.likes * 12 +
      latestMetric.replies * 18 +
      latestMetric.reposts * 22 +
      latestMetric.quotes * 18 +
      latestMetric.shares * 20;

    const current = buckets.get(hour) ?? {
      hour,
      count: 0,
      score: 0
    };

    current.count += 1;
    current.score += weightedScore;
    buckets.set(hour, current);
  }

  const discussionHeavy = /(留言|討論|互動|conversation|engagement)/i.test(input.goal ?? "");
  const fallbackHour = discussionHeavy ? 19 : 9;
  const fallbackMinute = discussionHeavy ? 30 : 20;

  const rankedBuckets = [...buckets.values()].sort((left, right) => {
    const leftAverage = left.score / left.count;
    const rightAverage = right.score / right.count;
    return rightAverage - leftAverage;
  });

  const winner = rankedBuckets[0];
  const targetHour = winner?.hour ?? fallbackHour;
  const targetMinute = winner ? 20 : fallbackMinute;
  const nextScheduledAt = buildNextUtcDate(now, targetHour, targetMinute);

  return {
    scheduledAt: nextScheduledAt,
    label: `${String(targetHour).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")}`,
    detail: winner
      ? `依最近 ${winner.count} 篇已發內容表現，${String(targetHour).padStart(2, "0")}:00 左右最穩。`
      : `目前歷史資料還不夠，先用 ${String(targetHour).padStart(2, "0")}:${String(targetMinute).padStart(2, "0")} 當預設時段。`
  };
}

function buildNextUtcDate(now: Date, targetHour: number, targetMinute: number) {
  const parts = getDatePartsInTimezone(now);
  const shouldMoveToTomorrow = parts.hour > targetHour || (parts.hour === targetHour && parts.minute >= targetMinute);
  const baseDate = shouldMoveToTomorrow
    ? addOneDay({ year: parts.year, month: parts.month, day: parts.day })
    : { year: parts.year, month: parts.month, day: parts.day };

  return new Date(
    Date.UTC(
      baseDate.year,
      baseDate.month - 1,
      baseDate.day,
      targetHour - AUTOPILOT_UTC_OFFSET_HOURS,
      targetMinute,
      0
    )
  );
}
