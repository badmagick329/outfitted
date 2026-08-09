import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type StoredImage = { key: string; width: number; height: number };
export interface StorageProvider {
  saveImage(input: Buffer, ownerId: string): Promise<StoredImage>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const root = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");
class LocalStorageProvider implements StorageProvider {
  async saveImage(input: Buffer, ownerId: string) {
    const id = crypto.randomUUID();
    const key = path.posix.join(ownerId, `${id}.webp`);
    const destination = path.join(/* turbopackIgnore: true */ root, key);
    await mkdir(path.dirname(destination), { recursive: true });
    const image = sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 });
    const info = await image.toFile(destination);
    return { key, width: info.width, height: info.height };
  }
  read(key: string) {
    return readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ root, key));
  }
  delete(key: string) {
    return rm(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ root, key), {
      force: true,
    });
  }
}
export const storage: StorageProvider = new LocalStorageProvider();
