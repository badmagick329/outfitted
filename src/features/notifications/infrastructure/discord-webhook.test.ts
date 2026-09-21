import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscordWebhookPayload } from "../domain/contracts";
import {
  discordRequestTimeoutMs,
  discordWebhookUrl,
  isDiscordConfigured,
  sendDiscordNotification,
} from "./discord-webhook";

const payload: DiscordWebhookPayload = {
  embeds: [{ title: "Test", timestamp: new Date().toISOString(), fields: [] }],
};

function response(status: number, retryAfter?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(retryAfter ? { "retry-after": retryAfter } : {}),
  };
}

describe("discord webhook", () => {
  beforeEach(() => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("treats missing or blank configuration as disabled", () => {
    expect(discordWebhookUrl()).toBeUndefined();
    expect(isDiscordConfigured()).toBe(false);
  });

  it("performs no request when unconfigured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendDiscordNotification(payload)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the JSON payload to the trimmed configured webhook", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "  https://discord.example/webhook  ");
    const fetchMock = vi.fn().mockResolvedValue(response(204));
    vi.stubGlobal("fetch", fetchMock);

    await sendDiscordNotification(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.example/webhook",
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
    );
  });

  it("fails a non-2xx response for retry without leaking the webhook URL", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "https://discord.example/webhook");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(500)));

    const error = (await sendDiscordNotification(payload).catch((caught) => caught)) as Error;

    expect(error.message).toContain("status 500");
    expect(error.message).not.toContain("discord.example");
  });

  it("fails a 429 with its retry hint so pg-boss retries", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "https://discord.example/webhook");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(429, "3")));

    await expect(sendDiscordNotification(payload)).rejects.toThrow("status 429 (retry after 3s)");
  });

  it("aborts a request that exceeds the timeout and rejects for retry without leaking the URL", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "https://discord.example/webhook");
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const fetchMock = vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted due to timeout", "TimeoutError")),
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = sendDiscordNotification(payload);
    controller.abort();
    const error = (await pending.catch((caught) => caught)) as Error;

    expect(timeout).toHaveBeenCalledWith(discordRequestTimeoutMs);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.example/webhook",
      expect.objectContaining({ signal: controller.signal }),
    );
    expect(error.name).toBe("TimeoutError");
    expect(error.message).not.toContain("discord.example");
  });
});
