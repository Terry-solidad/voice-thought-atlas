import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Recorder } from "@/components/Recorder";
import { NoteCard, TagPill } from "@/components/NoteCard";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Input } from "@/components/ui/input";
import { notesQuery, searchNotes, type Note } from "@/lib/notes";
import { pickEchoes, relatedNotes, agoLabel } from "@/lib/resurface";
import { remainingNotes, startOfMonthUTC } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/brain")({
  head: () => ({
    meta: [
      { title: "Your brain — Echo" },
      { name: "description", content: "Record, revisit and search your voice notes." },
      { property: "og:title", content: "Your brain — Echo" },
      { property: "og:description", content: "Record, revisit and search your voice notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notesQuery),
  component: Brain,
});

function Brain() {
  const { data: notes } = useSuspenseQuery(notesQuery);
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [justSaved, setJustSaved] = useState<Note | null>(null);

  const now = useMemo(() => new Date(), []);
  const used = notes.filter((n) => new Date(n.created_at) >= startOfMonthUTC(now)).length;
  const left = remainingNotes("free", used);
  const echoes = useMemo(() => pickEchoes(notes, now), [notes, now]);
  const savedEchoes = useMemo(
    () => (justSaved ? relatedNotes(justSaved, notes, 3) : []),
    [justSaved, notes],
  );

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [notes]);

  const query = q.trim();
  const search = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchNotes(query),
    enabled: query.length > 1,
  });

  const list = useMemo(() => {
    let base: Note[] = notes;
    if (query.length > 1) {
      const ql = query.toLowerCase();
      const byTag = notes.filter((n) => n.tags.some((t) => t.includes(ql)) || n.title.toLowerCase().includes(ql));
      const ids = new Set<string>();
      base = [...(search.data ?? []), ...byTag].filter((n) => (ids.has(n.id) ? false : (ids.add(n.id), true)));
    }
    if (tag) base = base.filter((n) => n.tags.includes(tag));
    return base;
  }, [notes, query, search.data, tag]);

  function onSaved(note: Note) {
    queryClient.setQueryData<Note[]>(notesQuery.queryKey, (old) => [note, ...(old ?? [])]);
    setJustSaved(note);
    toast.success(`Saved “${note.title}”`);
  }

  return (
    <div className="min-h-screen pb-24">
      <AppHeader>
        <button
          onClick={() => setUpgrade(true)}
          className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {left} of 10 free left
        </button>
      </AppHeader>

      <main className="mx-auto max-w-3xl px-6">
        <section className="flex flex-col items-center py-10">
          <Recorder disabled={left <= 0} onSaved={onSaved} onLimit={() => setUpgrade(true)} />
        </section>

        {justSaved && savedEchoes.length > 0 && (
          <section className="mb-10 animate-rise rounded-3xl border-2 border-primary/30 bg-primary-soft p-6">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> This connects to
            </p>
            <div className="mt-4 space-y-3">
              {savedEchoes.map((n) => (
                <Link key={n.id} to="/notes/$id" params={{ id: n.id }} className="block">
                  <p className="text-sm text-muted-foreground">
                    You talked about <strong className="text-foreground">#{n.shared[0]}</strong>{" "}
                    {agoLabel(new Date(n.created_at), now)}
                  </p>
                  <p className="font-display text-xl">{n.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {echoes.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Resurfaced for you
            </h2>
            <div className="space-y-3">
              {echoes.map((e) => (
                <Link
                  key={e.note.id}
                  to="/notes/$id"
                  params={{ id: e.note.id }}
                  className="block animate-rise rounded-3xl border bg-card p-6 shadow-soft transition-colors hover:border-primary/40"
                >
                  <p className="text-xs font-medium uppercase tracking-widest text-primary">{e.reason}</p>
                  <p className="mt-2 font-display text-2xl leading-snug">{e.note.title}</p>
                  <p className="mt-2 line-clamp-3 text-muted-foreground">“{e.note.transcript}”</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search everything you've said…"
              className="h-12 rounded-full pl-11"
            />
          </div>
          {tagCounts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tagCounts.map(([t]) => (
                <TagPill key={t} tag={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)} />
              ))}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {notes.length === 0 ? (
              <div className="rounded-3xl border border-dashed p-10 text-center">
                <p className="font-display text-2xl">Your first thought goes here</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tap the mic and talk about anything — a project, a plan, a half-formed idea.
                </p>
              </div>
            ) : list.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {search.isFetching ? "Searching…" : "Nothing matches that yet."}
              </p>
            ) : (
              list.map((n) => <NoteCard key={n.id} note={n} />)
            )}
          </div>
        </section>
      </main>

      <UpgradeDialog open={upgrade} onOpenChange={setUpgrade} />
    </div>
  );
}
