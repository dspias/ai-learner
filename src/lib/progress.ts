import { LEARNED_MASTERY } from "@/config/learning";

/** Overall progress (0-100) as mean mastery across topics. Pure. */
export function meanMastery(topics: { masteryScore: number }[]): number {
  if (topics.length === 0) return 0;
  return Math.round(
    topics.reduce((sum, t) => sum + t.masteryScore, 0) / topics.length,
  );
}

/** Count of topics that are learned (status learned OR mastery >= threshold). */
export function learnedCount(topics: { status: string; masteryScore: number }[]): number {
  return topics.filter((t) => t.status === "learned" || t.masteryScore >= LEARNED_MASTERY)
    .length;
}
