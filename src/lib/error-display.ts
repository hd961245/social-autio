export function toDisplayErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "Unknown error";
  const missingColumnMatch = rawMessage.match(/The column `([^`]+)` does not exist in the current database\./);

  if (missingColumnMatch) {
    return {
      message: `資料庫欄位尚未升級（缺少 ${missingColumnMatch[1]}），請先在目前線上環境執行 npm run db:push，再重新操作一次。`,
      rawMessage
    };
  }

  if (rawMessage.includes("Can't reach database server")) {
    return {
      message: "目前連不到資料庫，請先確認 Zeabur 的 PostgreSQL service 是否正常，並檢查 DATABASE_URL 是否指到正確的線上資料庫。",
      rawMessage
    };
  }

  return {
    message: rawMessage,
    rawMessage
  };
}
