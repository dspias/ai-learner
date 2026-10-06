import Link from "next/link";

export default function MarketingHeader({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-[#0b0f17]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-sm">
            AL
          </span>
          AI Learner
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 sm:flex">
          <Link href="/#features" className="hover:text-white">
            Features
          </Link>
          <Link href="/#how" className="hover:text-white">
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/signin" className="text-slate-300 hover:text-white">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
