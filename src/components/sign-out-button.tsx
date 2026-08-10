"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-ink/65 transition hover:bg-peach hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${className}`}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut size={14} aria-hidden="true" /> Sign out
    </button>
  );
}
