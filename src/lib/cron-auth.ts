import { headers } from "next/headers";

function getConfiguredSecret() {
  return process.env.CRON_SECRET?.trim();
}

export async function authorizeCronRequest(request: Request) {
  const configuredSecret = getConfiguredSecret();

  if (!configuredSecret) {
    return { ok: true as const };
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const forwardedSecret = (await headers()).get("x-cron-secret");

  const providedSecret = querySecret ?? headerSecret ?? bearerSecret ?? forwardedSecret;

  if (providedSecret !== configuredSecret) {
    return {
      ok: false as const,
      message: "Unauthorized cron request"
    };
  }

  return { ok: true as const };
}
