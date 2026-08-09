import { UploadForm } from "@/components/upload-form";

export default function UploadPage() {
  return (
    <>
      <header>
        <p className="font-mono text-xs font-bold tracking-[0.18em] text-berry">NEW RECORD</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Add a garment</h1>
        <p className="mt-3 max-w-xl text-ink/65">
          Upload up to six views. Each one is optimized and stored privately with the garment.
        </p>
      </header>
      <UploadForm />
    </>
  );
}
