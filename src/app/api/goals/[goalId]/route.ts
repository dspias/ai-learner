import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";

const patchSchema = z.object({
  language: z.string().min(1).max(60).optional(),
  dailyMinutes: z.number().int().min(5).max(600).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ goalId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { goalId } = await params;
    const patch = patchSchema.parse(await req.json());

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: { id: true },
    });
    if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.goal.update({ where: { id: goalId }, data: patch });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }
    console.error("goal update failed", err);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}
