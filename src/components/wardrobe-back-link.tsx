import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function WardrobeBackLink() {
  return (
    <Link
      href="/wardrobe"
      className="mb-5 flex w-fit items-center gap-2 text-sm font-bold text-ink/65 transition hover:text-berry"
    >
      <ArrowLeft size={16} /> Back to wardrobe
    </Link>
  );
}
