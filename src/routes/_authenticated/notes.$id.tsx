import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { NoteCard, TagPill } from "@/components/NoteCard";
import { Button } from "@/components/ui/button";
import { notesQuery } from "@/lib/notes";
import { relatedNotes, agoLabel } from "@/lib/resurface";

export const Route = createFileRoute("/_authenticated/notes/$id")({
  head: () => ({
    meta: [
      { title: "Voice note — Echo" },
      { name: "description", content: "A transcribed voice note and the ideas it connects to." },
      { property: "og:title", content: "Voice note — Echo" },
      { property: "og:description", content: "A transcribed voice note and the ideas it connects to." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notesQuery),
  component: NotePage,
});

function NotePage() {
  const { id } = Route.useParams();
  const { data: notes } = useSuspenseQuery(notesQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const note = notes.find((n) => n.id === id);

  if (!note) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <p className="py-20 text-center text-muted-foreground">This note doesn't exist anymore.</p>
      </div>
    );
  }
  const related = relatedNotes(note, notes);
  const now = new Date();

  async function remove() {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: notesQuery.queryKey });
    navigate({ to: "/brain" });
  }

  return (
    <div className="min-h-screen pb-24">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6">
        <Link to="/brain" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All notes
        </Link>
        <article className="mt-6 animate-rise">
          <p className="text-sm text-muted-foreground">
            {format(new Date(note.created_at), "EEEE, MMMM d · h:mm a")} · {agoLabel(new Date(note.created_at), now)}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{note.title}</h1>
          {note.summary && <p className="mt-4 text-lg text-muted-foreground">{note.summary}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {note.tags.map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>
          <div className="mt-8 rounded-3xl bg-muted p-6 md:p-8">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">What you said</p>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">{note.transcript}</p>
          </div>
        </article>

        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Link2 className="h-4 w-4 text-primary" /> Connected ideas
          </h2>
          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connections yet — they'll appear as you record more.</p>
          ) : (
            <div className="space-y-3">
              {related.map((n) => (
                <NoteCard key={n.id} note={n} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-12 flex justify-end">
          <Button variant="ghost" onClick={remove} className="text-destructive hover:text-destructive">
            <Trash2 /> Delete note
          </Button>
        </div>
      </main>
    </div>
  );
}
