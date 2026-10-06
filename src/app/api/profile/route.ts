import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";

const bodySchema = z.object({ defaultLanguage: z.string().min(1).max(60) });

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const { defaultLanguage } = bodySchema.parse(await req.json());
    await prisma.user.update({ where: { id: userId }, data: { defaultLanguage } });
    return NextResponse.json({ ok: true, defaultLanguage });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    console.error("profile update failed", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
