const statusDetails = {
  pending: {
    label: "Waiting",
    className: "border-citrus/80 bg-citrus/40 text-ink",
  },
  processing: {
    label: "Reading details",
    className: "border-citrus/80 bg-citrus/40 text-ink",
  },
  failed: {
    label: "Needs attention",
    className: "border-red-300 bg-red-50 text-red-700",
  },
} as const;

export type MemberStatus = keyof typeof statusDetails;

export function MemberStatusBadge({
  status,
  compact = false,
}: {
  status: MemberStatus;
  compact?: boolean;
}) {
  const details = statusDetails[status];

  return (
    <span
      className={`inline-flex w-fit shrink-0 rounded-full border font-mono font-bold uppercase tracking-wide ${compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-[10px]"} ${details.className}`}
    >
      {details.label}
    </span>
  );
}
