import AppHeader from "@/components/AppHeader";
import GoalBuilder from "@/components/GoalBuilder";
import { requirePageUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewGoalPage() {
  const userId = await requirePageUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultLanguage: true },
  });
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold">New learning goal</h1>
        <GoalBuilder defaultLanguage={user?.defaultLanguage ?? "English"} />
      </main>
    </>
  );
}
