import type { ReactNode } from "react";

const toneStyles = {
  mist: "border border-line bg-mist/75 shadow-[5px_5px_0_var(--color-peach)]",
  peach: "border border-line bg-peach/65 shadow-[5px_5px_0_var(--color-citrus)]",
  plain: "",
};

export function MemberPageHeader({
  title,
  description,
  backLink,
  action,
  status,
  tone = "plain",
}: {
  title: string;
  description?: ReactNode;
  backLink?: ReactNode;
  action?: ReactNode;
  status?: ReactNode;
  tone?: keyof typeof toneStyles;
}) {
  const panel = tone !== "plain";

  return (
    <header
      className={`flex flex-col justify-between gap-5 ${panel ? "rounded-3xl p-6 sm:p-8" : ""} ${action ? "sm:flex-row sm:items-end" : "sm:flex-row sm:items-start"} ${toneStyles[tone]}`}
    >
      <div className="min-w-0">
        {backLink}
        <h1
          className={`${backLink ? "mt-5" : ""} max-w-4xl break-words text-4xl font-bold tracking-[-0.05em] sm:text-5xl`}
        >
          {title}
        </h1>
        {description && <div className="mt-3 max-w-2xl text-ink/65">{description}</div>}
      </div>
      {(action || status) && <div className="w-fit shrink-0">{action ?? status}</div>}
    </header>
  );
}
