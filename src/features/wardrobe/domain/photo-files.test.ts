import { describe, expect, it } from "vitest";
import { canPreviewPhoto, isSupportedPhoto } from "./photo-files";

describe("wardrobe photo files", () => {
  it("accepts the documented browser image formats", () => {
    expect(isSupportedPhoto({ name: "jacket.jpg", type: "image/jpeg" })).toBe(true);
    expect(isSupportedPhoto({ name: "jacket.png", type: "image/png" })).toBe(true);
    expect(isSupportedPhoto({ name: "jacket.webp", type: "image/webp" })).toBe(true);
  });

  it("accepts HEIC files by extension when the browser omits their MIME type", () => {
    expect(isSupportedPhoto({ name: "JACKET.HEIC", type: "" })).toBe(true);
  });

  it("rejects image formats the upload flow does not document", () => {
    expect(isSupportedPhoto({ name: "jacket.svg", type: "image/svg+xml" })).toBe(false);
    expect(isSupportedPhoto({ name: "not-a-photo.jpg", type: "application/pdf" })).toBe(false);
  });

  it("uses a fallback instead of attempting to preview HEIC files", () => {
    expect(canPreviewPhoto({ name: "jacket.heic", type: "image/heic" })).toBe(false);
    expect(canPreviewPhoto({ name: "jacket.jpg", type: "image/jpeg" })).toBe(true);
  });
});
