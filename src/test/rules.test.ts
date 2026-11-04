import { describe, expect, it } from "vitest";
import { canRecord, remainingNotes, FREE_MONTHLY_NOTES } from "@/lib/plan";
import { pickEchoes } from "@/lib/resurface";

describe("free plan limit", () => {
  it("allows 10 notes per month on free", () => {
    expect(FREE_MONTHLY_NOTES).toBe(10);
    expect(canRecord("free", 9)).toBe(true);
    expect(canRecord("free", 10)).toBe(false);
    expect(remainingNotes("free", 3)).toBe(7);
  });
  it("is unlimited on the subscription", () => {
    expect(canRecord("unlimited", 500)).toBe(true);
  });
});

describe("resurfacing", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  it("resurfaces an older note sharing a topic with a recent one", () => {
    const notes = [
      { id: "new", title: "", summary: "", tags: ["garden app"], created_at: iso(1) },
      { id: "old", title: "", summary: "", tags: ["garden app"], created_at: iso(21) },
    ];
    const echoes = pickEchoes(notes, now);
    expect(echoes[0]!.note.id).toBe("old");
    expect(echoes[0]!.reason).toContain("3 weeks ago");
  });
  it("never resurfaces notes from the last 7 days", () => {
    const notes = [{ id: "a", title: "", summary: "", tags: ["x"], created_at: iso(6) }];
    expect(pickEchoes(notes, now)).toHaveLength(0);
  });
});
