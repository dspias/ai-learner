import { MASTERY_DECAY, MASTERY_WINDOW } from "@/config/learning";

export type AttemptScore = { score: number; createdAt: Date };

/**
 * Mastery (0-100) as a decay-weighted average of the most recent quiz scores.
 * Newer attempts count more: the i-th most recent attempt has weight DECAY^i.
 * Pure — no I/O. Only the most recent MASTERY_WINDOW attempts are considered.
 */
export function computeMastery(attempts: AttemptScore[]): number {
  if (attempts.length === 0) return 0;

  const recent = [...attempts]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, MASTERY_WINDOW);

  let weightedSum = 0;
  let weightTotal = 0;
  recent.forEach((a, i) => {
    const w = Math.pow(MASTERY_DECAY, i);
    weightedSum += a.score * w;
    weightTotal += w;
  });

  return Math.round(weightedSum / weightTotal);
}
