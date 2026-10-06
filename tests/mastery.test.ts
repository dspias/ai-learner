import { describe, it, expect } from "vitest";
import { computeMastery } from "@/lib/mastery";
import { MASTERY_DECAY } from "@/config/learning";

const d = (iso: string) => new Date(iso);

describe("computeMastery", () => {
  it("returns 0 with no attempts", () => {
    expect(computeMastery([])).toBe(0);
  });

  it("returns the single score when there's one attempt", () => {
    expect(computeMastery([{ score: 73, createdAt: d("2026-01-01") }])).toBe(73);
  });

  it("weights the most recent attempt most heavily", () => {
    // Newest = 100, older = 0. Expected = 100*1 / (1 + DECAY) over 2 attempts.
    const out = computeMastery([
      { score: 0, createdAt: d("2026-01-01") },
      { score: 100, createdAt: d("2026-01-02") },
    ]);
    const expected = Math.round((100 * 1) / (1 + MASTERY_DECAY));
    expect(out).toBe(expected);
    // A recent-good score pulls mastery above the simple average of 50.
    expect(out).toBeGreaterThan(50);
  });

  it("is order-independent of input (sorts by date)", () => {
    const a = computeMastery([
      { score: 100, createdAt: d("2026-01-02") },
      { score: 0, createdAt: d("2026-01-01") },
    ]);
    const b = computeMastery([
      { score: 0, createdAt: d("2026-01-01") },
      { score: 100, createdAt: d("2026-01-02") },
    ]);
    expect(a).toBe(b);
  });

  it("ignores attempts beyond the window (only recent ones count)", () => {
    // 5 recent 100s + one ancient 0 -> still 100 (window is 5).
    const attempts = [
      { score: 0, createdAt: d("2020-01-01") },
      { score: 100, createdAt: d("2026-01-01") },
      { score: 100, createdAt: d("2026-01-02") },
      { score: 100, createdAt: d("2026-01-03") },
      { score: 100, createdAt: d("2026-01-04") },
      { score: 100, createdAt: d("2026-01-05") },
    ];
    expect(computeMastery(attempts)).toBe(100);
  });
});
