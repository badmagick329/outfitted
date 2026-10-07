import { BatchImportForm } from "@/components/batch-import-form";
import { MemberPageHeader } from "@/components/member-page-header";
import { WardrobeBackLink } from "@/components/wardrobe-back-link";

export default function BatchImportPage() {
  return (
    <>
      <MemberPageHeader
        title="Import several garments"
        description={<p>Each photo becomes its own garment, so add one photo per garment.</p>}
        backLink={<WardrobeBackLink />}
        tone="peach"
      />
      <BatchImportForm />
    </>
  );
}
