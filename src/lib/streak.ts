/** Local-day key (year-month-day) for grouping study activity. Pure. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Consecutive-day study streak ending today (or yesterday, so the streak isn't
 * "lost" until a full day is missed). Pure — pass the study days and "now".
 */
export function computeStreak(studyDays: Date[], today: Date): number {
  const set = new Set(studyDays.map(dayKey));
  const cursor = new Date(today);

  // If nothing today, the streak can still be alive if yesterday counts.
  if (!set.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
