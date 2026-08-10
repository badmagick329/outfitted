import { describe, expect, it, vi } from "vitest";
import { trackAiCall } from "./track-ai-call";

describe("trackAiCall", () => {
  it("returns the AI data and records successful usage", async () => {
    const recorder = { record: vi.fn().mockResolvedValue(undefined) };
    const data = { name: "Berry jacket" };

    await expect(
      trackAiCall({
        recorder,
        userId: "user-1",
        operation: "garment_analysis",
        model: "model",
        call: async () => ({
          data,
          model: "model",
          providerRequestId: "response-1",
          usage: {
            inputTokens: 100,
            cachedInputTokens: 10,
            cacheWriteInputTokens: 0,
            outputTokens: 20,
          },
        }),
      }),
    ).resolves.toBe(data);
    expect(recorder.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        operation: "garment_analysis",
        status: "success",
        providerRequestId: "response-1",
      }),
    );
  });

  it("does not turn an analytics failure into a user-facing failure", async () => {
    const recorder = { record: vi.fn().mockRejectedValue(new Error("database unavailable")) };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      trackAiCall({
        recorder,
        userId: "user-1",
        operation: "outfit_suggestion",
        model: "model",
        call: async () => ({
          data: "result",
          model: "model",
          providerRequestId: null,
          usage: {
            inputTokens: 1,
            cachedInputTokens: 0,
            cacheWriteInputTokens: 0,
            outputTokens: 1,
          },
        }),
      }),
    ).resolves.toBe("result");
    errorSpy.mockRestore();
  });

  it("records a failed call and preserves the original error", async () => {
    const recorder = { record: vi.fn().mockResolvedValue(undefined) };
    const failure = new Error("provider unavailable");

    await expect(
      trackAiCall({
        recorder,
        userId: "user-1",
        operation: "outfit_suggestion",
        model: "model",
        call: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
    expect(recorder.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", model: "model" }),
    );
  });
});
