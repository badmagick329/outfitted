import { UploadForm } from "@/components/upload-form";
export default function UploadPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">NEW RECORD</p>
          <h1>Add a garment</h1>
          <p className="muted">
            Upload up to six views. Your original photos are optimized and stored privately.
          </p>
        </div>
      </header>
      <UploadForm />
    </>
  );
}
