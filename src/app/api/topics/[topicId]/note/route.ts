import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";

const bodySchema = z.object({ contentMd: z.string().max(100000) });

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { topicId } = await params;
    const { contentMd } = bodySchema.parse(await req.json());

    // Ownership check (note has no userId filter on its unique key).
    const topic = await prisma.topic.findFirst({
      where: { id: topicId, userId },
      select: { id: true },
    });
    if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const note = await prisma.note.upsert({
      where: { topicId },
      update: { contentMd },
      create: { userId, topicId, contentMd },
    });

    return NextResponse.json({ ok: true, updatedAt: note.updatedAt.toISOString() });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    }
    console.error("note save failed", err);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
