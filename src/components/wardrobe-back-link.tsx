import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function WardrobeBackLink({
  href = "/wardrobe",
  label = "Back to wardrobe",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-5 flex w-fit items-center gap-2 text-sm font-bold text-ink/65 transition hover:text-berry focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
    >
      <ArrowLeft size={16} aria-hidden="true" /> {label}
    </Link>
  );
}
