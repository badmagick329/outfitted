import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { LocalStorageProvider, thumbnailStorageKey } from "./storage";

const temporaryRoots: string[] = [];

async function temporaryStorage() {
  const root = await mkdtemp(path.join(os.tmpdir(), "outfitted-storage-"));
  temporaryRoots.push(root);
  return { root, storage: new LocalStorageProvider(root) };
}

async function portraitImage() {
  return sharp({
    create: { width: 1200, height: 1600, channels: 3, background: "#7d234f" },
  })
    .jpeg()
    .toBuffer();
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 })),
  );
});

describe("LocalStorageProvider", () => {
  it("creates display and thumbnail variants for a new image", async () => {
    const { root, storage } = await temporaryStorage();
    const saved = await storage.saveImage(await portraitImage(), "user-1");

    const displayMetadata = await sharp(await storage.read(saved.key)).metadata();
    const thumbnailMetadata = await sharp(await storage.read(saved.key, "thumbnail")).metadata();

    expect(displayMetadata).toMatchObject({ width: 1200, height: 1600, format: "webp" });
    expect(thumbnailMetadata).toMatchObject({ width: 480, height: 640, format: "webp" });
    await expect(readFile(path.join(root, thumbnailStorageKey(saved.key)))).resolves.toBeInstanceOf(
      Buffer,
    );
  });

  it("generates a missing thumbnail for an existing display image", async () => {
    const { root, storage } = await temporaryStorage();
    const saved = await storage.saveImage(await portraitImage(), "user-1");
    await rm(path.join(root, thumbnailStorageKey(saved.key)));

    const thumbnail = await storage.read(saved.key, "thumbnail");

    await expect(sharp(thumbnail).metadata()).resolves.toMatchObject({ width: 480, height: 640 });
  });

  it("deletes both stored variants", async () => {
    const { root, storage } = await temporaryStorage();
    const saved = await storage.saveImage(await portraitImage(), "user-1");

    await storage.delete(saved.key);

    await expect(readFile(path.join(root, saved.key))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(path.join(root, thumbnailStorageKey(saved.key)))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rotates stored display and thumbnail variants", async () => {
    const { storage } = await temporaryStorage();
    const saved = await storage.saveImage(await portraitImage(), "user-1");
    const rotated = await storage.rotateImage(saved.key, "user-1", "right");

    await expect(sharp(await storage.read(rotated.key)).metadata()).resolves.toMatchObject({
      width: 1600,
      height: 1200,
      format: "webp",
    });
    await expect(
      sharp(await storage.read(rotated.key, "thumbnail")).metadata(),
    ).resolves.toMatchObject({
      width: 640,
      height: 480,
      format: "webp",
    });
  });
});
