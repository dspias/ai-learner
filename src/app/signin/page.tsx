import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignInForm from "@/components/SignInForm";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold">AI Learner</h1>
      <p className="mb-6 text-sm text-slate-400">Sign in to continue.</p>
      <SignInForm />
    </main>
  );
}
