import Link from "next/link";
import { auth } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function AppHeader() {
  const session = await auth();

  return (
    <header className="border-b border-slate-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-sm font-semibold">
          AI Learner
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-400">
          <Link href="/dashboard" className="hover:text-slate-200">
            Dashboard
          </Link>
          <Link href="/goals/new" className="hover:text-slate-200">
            New goal
          </Link>
          <Link href="/settings" className="hover:text-slate-200">
            Settings
          </Link>
          {session?.user && <SignOutButton />}
        </nav>
      </div>
    </header>
  );
}
