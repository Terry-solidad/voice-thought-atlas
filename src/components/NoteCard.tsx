import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { Note } from "@/lib/notes";

export function TagPill({ tag, active, onClick }: { tag: string; active?: boolean; onClick?: () => void }) {
  const cls = active
    ? "rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
    : "rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground";
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      #{tag}
    </button>
  ) : (
    <span className={cls}>#{tag}</span>
  );
}

export function NoteCard({ note }: { note: Note }) {
  return (
    <Link
      to="/notes/$id"
      params={{ id: note.id }}
      className="block rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{note.title}</h3>
        <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(note.created_at), "MMM d")}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{note.summary || note.transcript}</p>
      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((t) => (
            <TagPill key={t} tag={t} />
          ))}
        </div>
      )}
    </Link>
  );
}
