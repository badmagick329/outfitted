import { describe, expect, it } from "vitest";
import { readPhotoFormData } from "./photo-request";

describe("readPhotoFormData", () => {
  it("accepts a normal photo upload", async () => {
    const body = new FormData();
    body.append("photo", new File(["image"], "photo.jpg", { type: "image/jpeg" }));
    const request = new Request("https://example.test/api/photos/id", {
      method: "PUT",
      body,
    });

    const parsed = await readPhotoFormData(request, 1);

    expect((parsed.get("photo") as File).name).toBe("photo.jpg");
  });

  it("rejects a declared oversized body before reading it", async () => {
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(1));
      },
    });
    const request = new Request("https://example.test/api/photos/id", {
      method: "PUT",
      headers: {
        "content-type": "multipart/form-data; boundary=photo",
        "content-length": String(14 * 1024 * 1024),
      },
      body,
      duplex: "half",
    } as RequestInit);

    await expect(readPhotoFormData(request, 1)).rejects.toMatchObject({ status: 413 });
    expect(request.bodyUsed).toBe(false);
  });

  it("stops a streamed upload that exceeds the limit despite a short declared length", async () => {
    let chunksSent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksSent += 1;
        controller.enqueue(new Uint8Array(1024 * 1024));
        if (chunksSent === 30) controller.close();
      },
    });
    const request = new Request("https://example.test/api/photos/id", {
      method: "PUT",
      headers: {
        "content-type": "multipart/form-data; boundary=photo",
        "content-length": "1",
      },
      body,
      duplex: "half",
    } as RequestInit);

    await expect(readPhotoFormData(request, 1)).rejects.toMatchObject({ status: 413 });
    expect(chunksSent).toBeLessThan(30);
  });
});
