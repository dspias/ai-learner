import {
  REVIEW_INTERVALS,
  LEARNED_MASTERY,
  REVIEW_PASS_PCT,
  FAILED_REVIEW_MULTIPLIER,
  MIN_REVIEW_INTERVAL_DAYS,
} from "@/config/learning";

export type TopicStatus = "not_started" | "in_progress" | "learned" | "needs_review";

export type SchedState = {
  status: TopicStatus;
  masteryScore: number;
  reviewStage: number;
  nextReviewAt: Date | null;
};

export type SchedUpdate = {
  status: TopicStatus;
  masteryScore: number;
  reviewStage: number;
  nextReviewAt: Date | null;
};

/** Days until the next review for a given stage on the ladder. */
export function intervalForStage(stage: number): number {
  const n = REVIEW_INTERVALS.length;
  if (stage < n) return REVIEW_INTERVALS[stage];
  // Past the ladder, the interval keeps doubling from the last entry.
  return REVIEW_INTERVALS[n - 1] * Math.pow(2, stage - (n - 1));
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** A topic is due when it's in a review state and its review date has passed. */
export function isDueForReview(
  s: Pick<SchedState, "status" | "nextReviewAt">,
  now: Date,
): boolean {
  return (
    (s.status === "learned" || s.status === "needs_review") &&
    s.nextReviewAt != null &&
    s.nextReviewAt.getTime() <= now.getTime()
  );
}

/**
 * Pure state transition applied after a quiz is graded.
 *
 * - Learning phase (not yet learned): reaching LEARNED_MASTERY marks the topic
 *   "learned" and schedules the first review (REVIEW_INTERVALS[0]); otherwise it
 *   stays "in_progress" with no review scheduled.
 * - Review phase, due + passed (>= REVIEW_PASS_PCT): advance a rung on the ladder.
 * - Review phase, due + failed: shorten the interval and flag "needs_review".
 * - Review phase but not yet due: just update mastery; leave the schedule alone.
 *
 * Mastery is always updated to `newMastery`.
 */
export function applyQuizResult(
  current: SchedState,
  newMastery: number,
  scorePct: number,
  now: Date,
): SchedUpdate {
  const learned = newMastery >= LEARNED_MASTERY;
  const passed = scorePct >= REVIEW_PASS_PCT;
  const inReviewPhase = current.status === "learned" || current.status === "needs_review";

  if (!inReviewPhase) {
    if (learned) {
      return {
        status: "learned",
        masteryScore: newMastery,
        reviewStage: 0,
        nextReviewAt: addDays(now, intervalForStage(0)),
      };
    }
    return { status: "in_progress", masteryScore: newMastery, reviewStage: 0, nextReviewAt: null };
  }

  if (!isDueForReview(current, now)) {
    return {
      status: current.status,
      masteryScore: newMastery,
      reviewStage: current.reviewStage,
      nextReviewAt: current.nextReviewAt,
    };
  }

  if (passed) {
    const nextStage = current.reviewStage + 1;
    return {
      status: "learned",
      masteryScore: newMastery,
      reviewStage: nextStage,
      nextReviewAt: addDays(now, intervalForStage(nextStage)),
    };
  }

  const shortened = Math.max(
    MIN_REVIEW_INTERVAL_DAYS,
    Math.round(intervalForStage(current.reviewStage) * FAILED_REVIEW_MULTIPLIER),
  );
  return {
    status: "needs_review",
    masteryScore: newMastery,
    reviewStage: Math.max(0, current.reviewStage - 1),
    nextReviewAt: addDays(now, shortened),
  };
}
