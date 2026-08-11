export const maxBatchGarments = 20;
export const batchUploadConcurrency = 3;

export function batchFileKey(file: Pick<File, "name" | "size" | "lastModified" | "type">) {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        if (item !== undefined) await worker(item);
      }
    }),
  );
}
