import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { generateStructured } from "@/lib/llm";
import { QuotaExceededError, quotaMessage } from "@/server/usage";
import { generatedTreeSchema, type GeneratedTree } from "@/schemas/topicTree";
import { topicTreeSystem, topicTreePrompt } from "@/prompts/topicTree";

const bodySchema = z.object({
  goal: z.string().min(1).max(500),
  background: z.string().max(5000).default(""),
  dailyMinutes: z.coerce.number().int().min(5).max(600),
  language: z.string().min(1).max(60).default("English"),
  targetDate: z.string().nullable().optional(),
});

/** Keep only prerequisite references that point at real, distinct topics. */
function sanitizeTree(tree: GeneratedTree): GeneratedTree {
  const allKeys = new Set<string>();
  for (const m of tree.milestones) for (const t of m.topics) allKeys.add(t.key);

  return {
    ...tree,
    milestones: tree.milestones.map((m) => ({
      ...m,
      topics: m.topics.map((t) => ({
        ...t,
        prerequisiteKeys: Array.from(
          new Set(t.prerequisiteKeys.filter((k) => k !== t.key && allKeys.has(k))),
        ),
      })),
    })),
  };
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = bodySchema.parse(await req.json());

    const tree = await generateStructured({
      system: topicTreeSystem,
      prompt: topicTreePrompt({
        goal: body.goal,
        background: body.background,
        dailyMinutes: body.dailyMinutes,
        language: body.language,
        targetDate: body.targetDate ?? null,
      }),
      schema: generatedTreeSchema,
      maxTokens: 6000,
    }, { userId, feature: "topic_tree" });

    return NextResponse.json({ tree: sanitizeTree(tree) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: quotaMessage(err.info), code: "quota_exceeded" }, { status: 402 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", issues: err.issues }, { status: 400 });
    }
    console.error("goal generate failed", err);
    return NextResponse.json(
      { error: "Failed to generate topic tree. Check LLM_PROVIDER and its API key/model." },
      { status: 500 },
    );
  }
}
