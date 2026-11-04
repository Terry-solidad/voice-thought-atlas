export type NoteLite = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  created_at: string;
};

const DAY = 86_400_000;

export function daysBetween(a: Date, b: Date) {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / DAY);
}

export function agoLabel(date: Date, now: Date): string {
  const d = daysBetween(date, now);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) {
    const w = Math.round(d / 7);
    return w === 1 ? "a week ago" : `${w} weeks ago`;
  }
  if (d < 365) {
    const m = Math.round(d / 30);
    return m === 1 ? "a month ago" : `${m} months ago`;
  }
  const y = Math.round(d / 365);
  return y === 1 ? "a year ago" : `${y} years ago`;
}

function shared(a: string[], b: string[]) {
  const set = new Set(a.map((t) => t.toLowerCase()));
  return b.filter((t) => set.has(t.toLowerCase()));
}

/** Notes sharing tags with `note`, most overlap first, then newest. */
export function relatedNotes<T extends NoteLite>(note: NoteLite, all: T[], limit = 5): (T & { shared: string[] })[] {
  return all
    .filter((n) => n.id !== note.id)
    .map((n) => ({ ...n, shared: shared(note.tags, n.tags) }))
    .filter((n) => n.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export type Echo<T> = { note: T; reason: string; kind: "thread" | "anniversary" };

/**
 * Pick older notes worth resurfacing:
 * 1. "thread" — a note 7+ days old sharing a tag with something said in the last 7 days.
 * 2. "anniversary" — a note from roughly 1 week, 1 month, 3 months or 1 year ago.
 */
export function pickEchoes<T extends NoteLite>(all: T[], now: Date, limit = 3): Echo<T>[] {
  const recent = all.filter((n) => daysBetween(new Date(n.created_at), now) < 7);
  const older = all.filter((n) => daysBetween(new Date(n.created_at), now) >= 7);
  const echoes: Echo<T>[] = [];
  const used = new Set<string>();

  const recentTags = recent.flatMap((n) => n.tags);
  const threads = older
    .map((n) => ({ n, s: shared(recentTags, n.tags) }))
    .filter((x) => x.s.length > 0)
    .sort((a, b) => b.s.length - a.s.length || a.n.created_at.localeCompare(b.n.created_at));
  for (const { n, s } of threads) {
    if (echoes.length >= limit) break;
    echoes.push({
      note: n,
      kind: "thread",
      reason: `You mentioned ${s[0]} ${agoLabel(new Date(n.created_at), now)}. Here's what you said.`,
    });
    used.add(n.id);
  }

  const marks = [7, 30, 90, 365];
  for (const n of older) {
    if (echoes.length >= limit) break;
    if (used.has(n.id)) continue;
    const d = daysBetween(new Date(n.created_at), now);
    if (marks.some((m) => Math.abs(d - m) <= 1)) {
      echoes.push({ note: n, kind: "anniversary", reason: `From ${agoLabel(new Date(n.created_at), now)}.` });
      used.add(n.id);
    }
  }
  return echoes;
}
