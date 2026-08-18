"use client";

import { useRouter } from "next/navigation";

type Member = { id: string; name: string | null; email: string };

export function AiUsageMemberSelect({
  range,
  selectedUserId,
  members,
}: {
  range: number;
  selectedUserId: string | null;
  members: Member[];
}) {
  const router = useRouter();

  function selectMember(userId: string) {
    const params = new URLSearchParams({ range: String(range) });
    if (userId) params.set("user", userId);
    router.replace(`/admin/ai-usage?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      aria-label="Member"
      value={selectedUserId ?? ""}
      onChange={(event) => selectMember(event.target.value)}
      className="h-10 max-w-64 rounded-full border border-line bg-canvas px-4 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
    >
      <option value="">All members</option>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.name ? `${member.name} (${member.email})` : member.email}
        </option>
      ))}
    </select>
  );
}
