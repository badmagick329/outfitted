import { describe, expect, it } from "vitest";
import { batchFileKey, runWithConcurrency } from "./batch-import";

describe("batch import", () => {
  it("uses stable browser file details to spot repeat selections", () => {
    const file = { name: "shirt.jpg", size: 123, lastModified: 456, type: "image/jpeg" };
    expect(batchFileKey(file)).toBe(batchFileKey({ ...file }));
    expect(batchFileKey(file)).not.toBe(batchFileKey({ ...file, name: "trousers.jpg" }));
  });

  it("limits concurrent uploads without dropping work", async () => {
    let active = 0;
    let maximumActive = 0;
    const completed: number[] = [];

    await runWithConcurrency([1, 2, 3, 4, 5, 6], 3, async (item) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      completed.push(item);
      active -= 1;
    });

    expect(maximumActive).toBe(3);
    expect(completed.sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
