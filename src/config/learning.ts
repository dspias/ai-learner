// All mastery / scheduling tuning constants live here so they're easy to find
// and change. The pure functions in src/server/* consume these.

/** Mastery score at or above which a topic is considered "learned". */
export const LEARNED_MASTERY = 80;

/** Quiz percent at or above which a scheduled review counts as "passed". */
export const REVIEW_PASS_PCT = 70;

/**
 * Spaced-repetition interval ladder, in days. After a learned topic passes a
 * review, it advances to the next interval; past the end, the interval doubles.
 */
export const REVIEW_INTERVALS = [2, 7, 21];

/** A failed review halves the current interval (min 1 day) and flags review. */
export const FAILED_REVIEW_MULTIPLIER = 0.5;
export const MIN_REVIEW_INTERVAL_DAYS = 1;

/**
 * Mastery is a weighted average of recent quiz attempts, newest weighted most.
 * Weight for the i-th most recent attempt is DECAY^i (i = 0 is newest).
 */
export const MASTERY_DECAY = 0.6;

/** How many recent attempts to consider when recomputing mastery. */
export const MASTERY_WINDOW = 5;

/** Questions generated per quiz. */
export const QUIZ_QUESTION_COUNT = 5;

/** Rough minutes we attribute to each activity type for auto study-sessions. */
export const SESSION_IDLE_TIMEOUT_MIN = 20;

/** Rough time budget per "Today" plan item, used to fit the daily minutes. */
export const REVIEW_ITEM_MINUTES = 10;
export const LEARN_ITEM_MINUTES = 20;

/** How many weakest topics to surface on the dashboard. */
export const WEAKEST_TOPICS_COUNT = 5;
