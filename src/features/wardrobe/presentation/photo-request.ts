import { payloadTooLarge } from "@/shared/application-error";
import { maxPhotoSizeBytes } from "../domain/photo-files";

// Multipart framing needs room beyond the photos, but must not be an unlimited
// way to make formData() buffer an attacker-controlled request in memory.
const multipartOverheadBytes = 1024 * 1024;

export async function readPhotoFormData(request: Request, maximumPhotos: number) {
  const maximumBytes = maximumPhotos * maxPhotoSizeBytes + multipartOverheadBytes;
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumBytes)
  )
    throw payloadTooLarge();

  if (!request.body) return request.formData();

  let receivedBytes = 0;
  let exceeded = false;
  const limitedBody = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        receivedBytes += chunk.byteLength;
        if (receivedBytes > maximumBytes) {
          exceeded = true;
          controller.error(payloadTooLarge());
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );

  try {
    return await new Response(limitedBody, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch (error) {
    if (exceeded) throw payloadTooLarge();
    throw error;
  }
}
