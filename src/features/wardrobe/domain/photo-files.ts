const supportedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const supportedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

export const maxPhotosPerGarment = 6;
export const maxPhotoSizeBytes = 12 * 1024 * 1024;
export const photoInputAccept = [...supportedMimeTypes, ...supportedExtensions].join(",");

export function isSupportedPhoto(file: Pick<File, "name" | "type">) {
  const lowerName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  if (supportedMimeTypes.has(mimeType)) return true;
  if (mimeType && mimeType !== "application/octet-stream") return false;
  return supportedExtensions.some((extension) => lowerName.endsWith(extension));
}

export function canPreviewPhoto(file: Pick<File, "name" | "type">) {
  const lowerName = file.name.toLowerCase();
  return !(
    ["image/heic", "image/heif"].includes(file.type.toLowerCase()) ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  );
}
