import type { DiscordWebhookPayload } from "../domain/contracts";

export const discordRequestTimeoutMs = 10_000;

/**
 * Discord webhook credentials are optional deployment configuration. Absence disables
 * notifications rather than failing startup, so both the web and worker processes must
 * read this lazily and treat blank values as unset.
 */
export function discordWebhookUrl() {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  return url ? url : undefined;
}

export function isDiscordConfigured() {
  return Boolean(discordWebhookUrl());
}

/**
 * Delivers one message. Any non-2xx response is thrown so pg-boss retries it; a timeout
 * aborts the request and also throws. 429 is a normal retryable outcome and is reported
 * with its retry hint. The webhook URL is a secret and is deliberately never included in
 * the error or logs.
 */
export async function sendDiscordNotification(payload: DiscordWebhookPayload) {
  const url = discordWebhookUrl();
  if (!url) return;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(discordRequestTimeoutMs),
  });
  if (response.ok) return;
  const retryAfter = response.headers.get("retry-after")?.trim();
  const retryHint = retryAfter ? ` (retry after ${retryAfter}s)` : "";
  throw new Error(`Discord webhook responded with status ${response.status}${retryHint}`);
}
