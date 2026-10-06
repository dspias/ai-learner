"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/signin" })}
      className="text-slate-400 hover:text-slate-200"
    >
      Sign out
    </button>
  );
}
