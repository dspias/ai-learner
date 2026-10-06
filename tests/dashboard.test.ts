import { describe, it, expect } from "vitest";
import { meanMastery, learnedCount } from "@/lib/progress";
import { computeStreak } from "@/lib/streak";
import {
  isLearned,
  dueReviews,
  unlockedNextTopics,
  weakestTopics,
  buildTodayPlan,
  type PlanTopic,
} from "@/lib/planner";

const NOW = new Date("2026-05-01T12:00:00Z");
const d = (iso: string) => new Date(iso);

// Topic fixtures used across planner tests.
const A: PlanTopic = {
  id: "A", title: "A", milestonePosition: 0, position: 0,
  status: "learned", masteryScore: 85, nextReviewAt: d("2026-04-20"), prerequisiteIds: [],
};
const B: PlanTopic = {
  id: "B", title: "B", milestonePosition: 0, position: 1,
  status: "in_progress", masteryScore: 40, nextReviewAt: null, prerequisiteIds: ["A"],
};
const C: PlanTopic = {
  id: "C", title: "C", milestonePosition: 0, position: 2,
  status: "not_started", masteryScore: 0, nextReviewAt: null, prerequisiteIds: ["B"],
};
const D: PlanTopic = {
  id: "D", title: "D", milestonePosition: 1, position: 0,
  status: "needs_review", masteryScore: 60, nextReviewAt: d("2026-04-25"), prerequisiteIds: [],
};
const E: PlanTopic = {
  id: "E", title: "E", milestonePosition: 1, position: 1,
  status: "not_started", masteryScore: 0, nextReviewAt: null, prerequisiteIds: [],
};
const ALL = [A, B, C, D, E];

describe("progress", () => {
  it("meanMastery averages mastery", () => {
    expect(meanMastery([])).toBe(0);
    expect(meanMastery([{ masteryScore: 80 }, { masteryScore: 20 }])).toBe(50);
    expect(meanMastery(ALL)).toBe(37); // (85+40+0+60+0)/5
  });
  it("learnedCount counts learned/high-mastery topics", () => {
    expect(learnedCount(ALL)).toBe(1); // only A
  });
});

describe("computeStreak", () => {
  // Use local-time constructors so day keys don't shift with the host timezone.
  const ld = (y: number, m: number, day: number, h = 0) => new Date(y, m, day, h);
  const today = ld(2026, 4, 1, 20); // May 1, 20:00 local
  it("counts consecutive days ending today", () => {
    const days = [ld(2026, 4, 1), ld(2026, 3, 30), ld(2026, 3, 29)];
    expect(computeStreak(days, today)).toBe(3);
  });
  it("stays alive if yesterday counts but not today yet", () => {
    const days = [ld(2026, 3, 30), ld(2026, 3, 29)];
    expect(computeStreak(days, today)).toBe(2);
  });
  it("is zero when the last study day is older than yesterday", () => {
    const days = [ld(2026, 3, 28), ld(2026, 3, 27)];
    expect(computeStreak(days, today)).toBe(0);
  });
  it("breaks on a gap", () => {
    const days = [ld(2026, 4, 1), ld(2026, 3, 29)]; // missing Apr 30
    expect(computeStreak(days, today)).toBe(1);
  });
});

describe("planner", () => {
  it("isLearned by status or mastery threshold", () => {
    expect(isLearned(A)).toBe(true);
    expect(isLearned(D)).toBe(false);
    expect(isLearned({ status: "in_progress", masteryScore: 90 })).toBe(true);
  });

  it("dueReviews returns due topics, most overdue first", () => {
    expect(dueReviews(ALL, NOW).map((t) => t.id)).toEqual(["A", "D"]);
  });

  it("unlockedNextTopics: prereqs learned, not done, in study order", () => {
    // B (prereq A learned) and E (no prereqs); C is locked (prereq B not learned)
    expect(unlockedNextTopics(ALL).map((t) => t.id)).toEqual(["B", "E"]);
  });

  it("weakestTopics excludes not-started, sorts ascending", () => {
    expect(weakestTopics(ALL).map((t) => t.id)).toEqual(["B", "D", "A"]);
  });

  it("buildTodayPlan fits the minute budget (reviews first)", () => {
    const plan = buildTodayPlan(ALL, 30, 0, NOW);
    expect(plan.items.map((i) => `${i.kind}:${i.topicId}`)).toEqual([
      "review:A",
      "review:D",
    ]);
    expect(plan.totalMinutes).toBe(20);
    expect(plan.dueCount).toBe(2);
  });

  it("buildTodayPlan adds new topics when budget allows", () => {
    const plan = buildTodayPlan(ALL, 60, 0, NOW);
    expect(plan.items.map((i) => `${i.kind}:${i.topicId}`)).toEqual([
      "review:A",
      "review:D",
      "learn:B",
      "learn:E",
    ]);
  });

  it("small budget stops at the budget (no catch-up)", () => {
    const plan = buildTodayPlan(ALL, 10, 0, NOW);
    expect(plan.items.map((i) => i.topicId)).toEqual(["A"]);
  });

  it("missed days include all due reviews for catch-up, flagged overBudget", () => {
    const plan = buildTodayPlan(ALL, 10, 3, NOW);
    expect(plan.items.map((i) => `${i.topicId}:${i.overBudget}`)).toEqual([
      "A:false",
      "D:true",
    ]);
  });
});
