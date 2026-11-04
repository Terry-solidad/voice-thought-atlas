/** Free plan: number of voice notes a person can transcribe per calendar month. */
export const FREE_MONTHLY_NOTES = 10;

export type Plan = "free" | "unlimited";

export function startOfMonthUTC(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function remainingNotes(plan: Plan, usedThisMonth: number): number {
  if (plan === "unlimited") return Infinity;
  return Math.max(0, FREE_MONTHLY_NOTES - usedThisMonth);
}

export function canRecord(plan: Plan, usedThisMonth: number): boolean {
  return remainingNotes(plan, usedThisMonth) > 0;
}
