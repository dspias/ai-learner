/**
 * Pure period math for rolling token quotas. The period is anchored at
 * `anchorStart` and repeats every `periodDays`; given `now`, returns the
 * current window. No I/O.
 */
export function computePeriod(
  anchorStart: Date,
  periodDays: number,
  now: Date,
): { start: Date; end: Date } {
  const periodMs = periodDays * 86_400_000;
  let startMs = anchorStart.getTime();

  if (now.getTime() >= startMs) {
    const periodsElapsed = Math.floor((now.getTime() - startMs) / periodMs);
    startMs += periodsElapsed * periodMs;
  }
  return { start: new Date(startMs), end: new Date(startMs + periodMs) };
}

export function remaining(limit: number, used: number): number {
  return Math.max(0, limit - used);
}
