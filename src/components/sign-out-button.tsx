"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-ink/65 transition hover:bg-peach hover:text-ink"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut size={14} /> Sign out
    </button>
  );
}
