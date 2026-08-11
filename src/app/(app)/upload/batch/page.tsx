import { BatchUploadForm } from "@/components/batch-upload-form";
import { MemberPageHeader } from "@/components/member-page-header";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";

export default function BatchUploadPage() {
  return (
    <>
      <MemberPageHeader
        title="Import several garments"
        description={
          <p>
            Choose one photo for each garment. We’ll create a separate wardrobe record from every
            photo.
          </p>
        }
        backLink={<WardrobeBackLink />}
        tone="peach"
      />
      <BatchUploadForm />
    </>
  );
}
