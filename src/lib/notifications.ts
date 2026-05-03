import { isDiscordConfigured, sendDiscordMessage } from "@/lib/discord";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";

type NotificationButton = {
  text: string;
  url: string;
};

export function getDailyDigestChannel() {
  if (isDiscordConfigured()) {
    return "discord" as const;
  }

  if (isTelegramConfigured()) {
    return "telegram" as const;
  }

  return "none" as const;
}

export function isDailyDigestConfigured() {
  return getDailyDigestChannel() !== "none";
}

export async function sendDailyDigest(input: {
  text: string;
  buttons?: NotificationButton[];
}) {
  const channel = getDailyDigestChannel();

  if (channel === "discord") {
    await sendDiscordMessage(input);
    return { channel };
  }

  if (channel === "telegram") {
    await sendTelegramMessage(input);
    return { channel };
  }

  throw new Error("尚未設定 Discord 或 Telegram，每日日報暫時無法送出。");
}
