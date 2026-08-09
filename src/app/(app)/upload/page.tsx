import { UploadForm } from "@/components/upload-form";

export default function UploadPage() {
  return (
    <>
      <header className="rounded-3xl border border-line bg-peach/65 p-6 shadow-[5px_5px_0_var(--color-citrus)] sm:p-8">
        <p className="inline-flex rounded-full bg-berry px-3 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-citrus">
          NEW RECORD
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Add a garment</h1>
        <p className="mt-3 max-w-xl text-ink/65">
          Upload up to six views. Each one is optimized and stored privately with the garment.
        </p>
      </header>
      <UploadForm />
    </>
  );
}
