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
      <UploadForm />
    </>
  );
}
