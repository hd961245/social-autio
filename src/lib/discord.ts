import { env } from "@/lib/env";

type DiscordButton = {
  text: string;
  url: string;
};

function getDiscordWebhookUrl() {
  return env.discordDailyWebhookUrl();
}

export function isDiscordConfigured() {
  return Boolean(getDiscordWebhookUrl());
}

export async function sendDiscordMessage(input: {
  text: string;
  buttons?: DiscordButton[];
}) {
  const webhookUrl = getDiscordWebhookUrl();

  if (!webhookUrl) {
    throw new Error("Discord 尚未設定，請先補 DISCORD_DAILY_WEBHOOK_URL。");
  }

  const embeds = input.buttons?.length
    ? [
        {
          title: "快速入口",
          color: 0xc84f2c,
          fields: input.buttons.map((button) => ({
            name: button.text,
            value: button.url
          }))
        }
      ]
    : undefined;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: input.text,
      embeds
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Discord webhook error (${response.status}): ${detail.slice(0, 400)}`);
  }
}
