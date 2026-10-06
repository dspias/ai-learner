import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-400 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded bg-blue-600 text-xs text-white">
            AL
          </span>
          <span>AI Learner</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/#features" className="hover:text-white">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/signin" className="hover:text-white">
            Sign in
          </Link>
        </nav>
        <span className="text-slate-600">A structured learning layer on top of an LLM.</span>
      </div>
    </footer>
  );
}
