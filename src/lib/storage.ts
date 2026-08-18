import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type StoredImage = { key: string; width: number; height: number };
export type ImageVariant = "display" | "thumbnail";
export interface StorageProvider {
  saveImage(input: Buffer, ownerId: string): Promise<StoredImage>;
  rotateImage(key: string, ownerId: string, direction: "left" | "right"): Promise<StoredImage>;
  read(key: string, variant?: ImageVariant): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const root = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");

export function thumbnailStorageKey(key: string) {
  const extension = path.posix.extname(key);
  return extension
    ? `${key.slice(0, -extension.length)}.thumbnail${extension}`
    : `${key}.thumbnail.webp`;
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export class LocalStorageProvider implements StorageProvider {
  private readonly thumbnailReads = new Map<string, Promise<Buffer>>();

  constructor(private readonly storageRoot = root) {}

  private destination(key: string) {
    return path.join(/* turbopackIgnore: true */ this.storageRoot, key);
  }

  private async generateThumbnail(key: string) {
    const destination = this.destination(thumbnailStorageKey(key));
    await mkdir(path.dirname(destination), { recursive: true });
    const displayImage = await readFile(this.destination(key));
    await sharp(displayImage, { failOn: "none" })
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(destination);
    return readFile(destination);
  }

  async saveImage(input: Buffer, ownerId: string) {
    const id = crypto.randomUUID();
    const key = path.posix.join(ownerId, `${id}.webp`);
    const displayDestination = this.destination(key);
    const thumbnailDestination = this.destination(thumbnailStorageKey(key));
    await mkdir(path.dirname(displayDestination), { recursive: true });
    const image = sharp(input, { failOn: "none" }).rotate();

    try {
      const [displayInfo] = await Promise.all([
        image
          .clone()
          .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 86 })
          .toFile(displayDestination),
        image
          .clone()
          .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 78 })
          .toFile(thumbnailDestination),
      ]);
      return { key, width: displayInfo.width, height: displayInfo.height };
    } catch (error) {
      await Promise.allSettled([
        rm(displayDestination, { force: true }),
        rm(thumbnailDestination, { force: true }),
      ]);
      throw error;
    }
  }

  async rotateImage(key: string, ownerId: string, direction: "left" | "right") {
    const input = await readFile(this.destination(key));
    const rotated = await sharp(input, { failOn: "none" })
      .rotate(direction === "left" ? 270 : 90)
      .toBuffer();
    return this.saveImage(rotated, ownerId);
  }

  async read(key: string, variant: ImageVariant = "display") {
    if (variant === "display") return readFile(this.destination(key));

    const thumbnailKey = thumbnailStorageKey(key);
    try {
      return await readFile(this.destination(thumbnailKey));
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }

    const activeRead = this.thumbnailReads.get(key);
    if (activeRead) return activeRead;
    const generated = this.generateThumbnail(key).finally(() => this.thumbnailReads.delete(key));
    this.thumbnailReads.set(key, generated);
    return generated;
  }

  async delete(key: string) {
    await this.thumbnailReads.get(key)?.catch(() => undefined);
    await Promise.all([
      rm(this.destination(key), { force: true }),
      rm(this.destination(thumbnailStorageKey(key)), { force: true }),
    ]);
  }
}
export const storage: StorageProvider = new LocalStorageProvider();
