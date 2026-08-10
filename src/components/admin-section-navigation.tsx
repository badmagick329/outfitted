import Link from "next/link";

export function AdminSectionNavigation({ active }: { active: "users" | "ai-usage" }) {
  return (
    <nav className="mt-7 flex flex-wrap gap-2" aria-label="Administration sections">
      {[
        { key: "users", href: "/admin/users", label: "Member access" },
        { key: "ai-usage", href: "/admin/ai-usage", label: "AI usage" },
      ].map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${
            active === item.key
              ? "border-teal bg-teal text-canvas"
              : "border-line bg-canvas text-ink/65 hover:border-teal/40 hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
