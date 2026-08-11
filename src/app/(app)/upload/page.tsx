import Link from "next/link";
import { Images } from "lucide-react";
import { MemberPageHeader } from "@/components/member-page-header";
import { UploadForm } from "@/components/upload-form";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";

export default function UploadPage() {
  return (
    <>
      <MemberPageHeader
        title="Add a garment"
        description={
          <p>
            Start with one clear photo. It will be optimized and stored privately with the garment.
          </p>
        }
        backLink={<WardrobeBackLink />}
        tone="peach"
      />
      <aside className="mt-9 flex max-w-3xl flex-col gap-4 rounded-2xl border border-line bg-mist/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <strong className="block text-base">Adding several garments?</strong>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Import a batch when each photo shows one garment.
          </p>
        </div>
        <Link
          href="/upload/batch"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-teal/30 bg-canvas px-5 py-3 text-sm font-bold text-teal transition hover:border-teal hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
        >
          <Images size={17} aria-hidden="true" /> Import several
        </Link>
      </aside>
      <UploadForm />
    </>
  );
}
