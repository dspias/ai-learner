import { describe, it, expect } from "vitest";
import {
  intervalForStage,
  isDueForReview,
  applyQuizResult,
  addDays,
  type SchedState,
} from "@/lib/scheduling";
import { REVIEW_INTERVALS, LEARNED_MASTERY } from "@/config/learning";

const NOW = new Date("2026-03-01T12:00:00Z");
const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86_400_000);

describe("intervalForStage", () => {
  it("follows the ladder, then doubles past the end", () => {
    expect(intervalForStage(0)).toBe(REVIEW_INTERVALS[0]); // 2
    expect(intervalForStage(1)).toBe(REVIEW_INTERVALS[1]); // 7
    expect(intervalForStage(2)).toBe(REVIEW_INTERVALS[2]); // 21
    expect(intervalForStage(3)).toBe(REVIEW_INTERVALS[2] * 2); // 42
    expect(intervalForStage(4)).toBe(REVIEW_INTERVALS[2] * 4); // 84
  });
});

describe("isDueForReview", () => {
  it("true only for review states with a past review date", () => {
    expect(isDueForReview({ status: "learned", nextReviewAt: addDays(NOW, -1) }, NOW)).toBe(true);
    expect(isDueForReview({ status: "needs_review", nextReviewAt: addDays(NOW, -1) }, NOW)).toBe(true);
    expect(isDueForReview({ status: "learned", nextReviewAt: addDays(NOW, 1) }, NOW)).toBe(false);
    expect(isDueForReview({ status: "in_progress", nextReviewAt: addDays(NOW, -1) }, NOW)).toBe(false);
    expect(isDueForReview({ status: "learned", nextReviewAt: null }, NOW)).toBe(false);
  });
});

describe("applyQuizResult", () => {
  const learning: SchedState = {
    status: "not_started",
    masteryScore: 0,
    reviewStage: 0,
    nextReviewAt: null,
  };

  it("learning phase: high mastery becomes learned and schedules first review", () => {
    const out = applyQuizResult(learning, 85, 85, NOW);
    expect(out.status).toBe("learned");
    expect(out.reviewStage).toBe(0);
    expect(out.nextReviewAt).not.toBeNull();
    expect(daysBetween(out.nextReviewAt!, NOW)).toBe(REVIEW_INTERVALS[0]);
  });

  it("learning phase: low mastery stays in_progress with no review", () => {
    const out = applyQuizResult(learning, 40, 40, NOW);
    expect(out.status).toBe("in_progress");
    expect(out.nextReviewAt).toBeNull();
    expect(out.masteryScore).toBe(40);
  });

  it("due review passed: advances a rung on the ladder", () => {
    const current: SchedState = {
      status: "learned",
      masteryScore: 82,
      reviewStage: 0,
      nextReviewAt: addDays(NOW, -1), // due
    };
    const out = applyQuizResult(current, 88, 90, NOW);
    expect(out.status).toBe("learned");
    expect(out.reviewStage).toBe(1);
    expect(daysBetween(out.nextReviewAt!, NOW)).toBe(REVIEW_INTERVALS[1]); // 7
  });

  it("due review failed: shortens interval and flags needs_review", () => {
    const current: SchedState = {
      status: "learned",
      masteryScore: 82,
      reviewStage: 2, // interval 21
      nextReviewAt: addDays(NOW, -1),
    };
    const out = applyQuizResult(current, 55, 40, NOW);
    expect(out.status).toBe("needs_review");
    expect(out.reviewStage).toBe(1); // decremented
    // 21 * 0.5 = 10.5 -> 11
    expect(daysBetween(out.nextReviewAt!, NOW)).toBe(Math.round(REVIEW_INTERVALS[2] * 0.5));
  });

  it("review phase but not due: updates mastery only, schedule untouched", () => {
    const future = addDays(NOW, 5);
    const current: SchedState = {
      status: "learned",
      masteryScore: 82,
      reviewStage: 1,
      nextReviewAt: future,
    };
    const out = applyQuizResult(current, 90, 95, NOW);
    expect(out.status).toBe("learned");
    expect(out.reviewStage).toBe(1);
    expect(out.nextReviewAt).toBe(future);
    expect(out.masteryScore).toBe(90);
  });

  it("LEARNED_MASTERY boundary is inclusive", () => {
    const out = applyQuizResult(learning, LEARNED_MASTERY, LEARNED_MASTERY, NOW);
    expect(out.status).toBe("learned");
  });
});
