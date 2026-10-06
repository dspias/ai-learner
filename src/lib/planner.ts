import {
  LEARNED_MASTERY,
  REVIEW_ITEM_MINUTES,
  LEARN_ITEM_MINUTES,
  WEAKEST_TOPICS_COUNT,
} from "@/config/learning";
import { isDueForReview, type TopicStatus } from "@/lib/scheduling";

export type PlanTopic = {
  id: string;
  title: string;
  milestonePosition: number;
  position: number;
  status: TopicStatus;
  masteryScore: number;
  nextReviewAt: Date | null;
  prerequisiteIds: string[];
};

export type PlanItem = {
  topicId: string;
  title: string;
  kind: "review" | "learn";
  minutes: number;
  overBudget: boolean;
};

export type TodayPlan = {
  items: PlanItem[];
  totalMinutes: number;
  dueCount: number;
  missedDays: number;
};

export function isLearned(t: Pick<PlanTopic, "status" | "masteryScore">): boolean {
  return t.status === "learned" || t.masteryScore >= LEARNED_MASTERY;
}

/** Topics due for review, most overdue first. */
export function dueReviews(topics: PlanTopic[], now: Date): PlanTopic[] {
  return topics
    .filter((t) => isDueForReview({ status: t.status, nextReviewAt: t.nextReviewAt }, now))
    .sort((a, b) => (a.nextReviewAt!.getTime() - b.nextReviewAt!.getTime()));
}

/** Not-yet-learned topics whose prerequisites are all learned, in study order. */
export function unlockedNextTopics(topics: PlanTopic[]): PlanTopic[] {
  const learnedIds = new Set(topics.filter(isLearned).map((t) => t.id));
  return topics
    .filter((t) => t.status === "not_started" || t.status === "in_progress")
    .filter((t) => !isLearned(t))
    .filter((t) => t.prerequisiteIds.every((p) => learnedIds.has(p)))
    .sort((a, b) => a.milestonePosition - b.milestonePosition || a.position - b.position);
}

/** Lowest-mastery topics the learner has actually started. */
export function weakestTopics(topics: PlanTopic[], n = WEAKEST_TOPICS_COUNT): PlanTopic[] {
  return topics
    .filter((t) => t.status !== "not_started")
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, n);
}

/**
 * The "Today" plan: due reviews first, then the next unlocked topics, fit to the
 * available minutes. When days were missed, all due reviews are included for
 * catch-up even if they exceed the budget (flagged overBudget); otherwise the
 * plan stops at the budget. Pure.
 */
export function buildTodayPlan(
  topics: PlanTopic[],
  minutes: number,
  missedDays: number,
  now: Date,
): TodayPlan {
  const reviews = dueReviews(topics, now);
  const reviewIds = new Set(reviews.map((t) => t.id));
  const next = unlockedNextTopics(topics).filter((t) => !reviewIds.has(t.id));

  const items: PlanItem[] = [];
  let used = 0;

  for (const r of reviews) {
    const over = used + REVIEW_ITEM_MINUTES > minutes;
    if (over && missedDays <= 0) break; // catch-up mode includes all due reviews
    items.push({
      topicId: r.id,
      title: r.title,
      kind: "review",
      minutes: REVIEW_ITEM_MINUTES,
      overBudget: over,
    });
    used += REVIEW_ITEM_MINUTES;
  }

  for (const t of next) {
    if (used + LEARN_ITEM_MINUTES > minutes) break;
    items.push({
      topicId: t.id,
      title: t.title,
      kind: "learn",
      minutes: LEARN_ITEM_MINUTES,
      overBudget: false,
    });
    used += LEARN_ITEM_MINUTES;
  }

  return { items, totalMinutes: used, dueCount: reviews.length, missedDays };
}
