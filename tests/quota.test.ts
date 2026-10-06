import { describe, it, expect } from "vitest";
import { computePeriod, remaining } from "@/lib/quota";

const anchor = new Date("2026-01-01T00:00:00Z");
const day = (n: number) => new Date(anchor.getTime() + n * 86_400_000);

describe("computePeriod", () => {
  it("first period covers [anchor, anchor+days)", () => {
    const { start, end } = computePeriod(anchor, 30, day(10));
    expect(start.toISOString()).toBe(anchor.toISOString());
    expect(end.toISOString()).toBe(day(30).toISOString());
  });

  it("rolls to the next period after days elapse", () => {
    const { start, end } = computePeriod(anchor, 30, day(45));
    expect(start.toISOString()).toBe(day(30).toISOString());
    expect(end.toISOString()).toBe(day(60).toISOString());
  });

  it("boundary: exactly at period end starts a new period", () => {
    const { start } = computePeriod(anchor, 30, day(30));
    expect(start.toISOString()).toBe(day(30).toISOString());
  });

  it("handles now before the anchor (keeps the first period)", () => {
    const { start, end } = computePeriod(anchor, 30, day(-5));
    expect(start.toISOString()).toBe(anchor.toISOString());
    expect(end.toISOString()).toBe(day(30).toISOString());
  });
});

describe("remaining", () => {
  it("never goes negative", () => {
    expect(remaining(100, 30)).toBe(70);
    expect(remaining(100, 120)).toBe(0);
  });
});
