import { env } from "@/lib/env";

type TelegramInlineButton = {
  text: string;
  url: string;
};

function getTelegramConfig() {
  const botToken = env.telegramBotToken();
  const chatId = env.telegramChatId();

  if (!botToken || !chatId) {
    return null;
  }

  return { botToken, chatId };
}

export function isTelegramConfigured() {
  return Boolean(getTelegramConfig());
}

export async function sendTelegramMessage(input: {
  text: string;
  buttons?: TelegramInlineButton[];
}) {
  const config = getTelegramConfig();

  if (!config) {
    throw new Error("Telegram 尚未設定，請先補 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID。");
  }

  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: config.chatId,
      text: input.text,
      reply_markup: input.buttons?.length
        ? {
            inline_keyboard: [input.buttons.map((button) => ({ text: button.text, url: button.url }))]
          }
        : undefined
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  return response.json();
}
