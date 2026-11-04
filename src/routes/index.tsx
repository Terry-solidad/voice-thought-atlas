import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, Link2, Sparkles, Search } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { FREE_MONTHLY_NOTES } from "@/lib/plan";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Echo — your ideas, said out loud, brought back" },
      { name: "description", content: "Record voice memos. Echo transcribes, tags and links them, then resurfaces old ideas at the moment they matter." },
      { property: "og:title", content: "Echo — a second brain for voice notes" },
      { property: "og:description", content: "Talk it out. Echo remembers, connects, and reminds you what you said." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Mic, title: "Just talk", body: "One tap to record in the car, on a walk, wherever the idea shows up." },
  { icon: Link2, title: "Ideas link themselves", body: "Every note is transcribed, titled and tagged, then connected to what you said before." },
  { icon: Sparkles, title: "It comes back", body: "“You mentioned this three weeks ago — here's what you said.” Old thoughts return when they're relevant." },
  { icon: Search, title: "Find anything", body: "Search every word you've ever said, across every note." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="animate-rise py-20 text-center md:py-28">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> A second brain for voice notes
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
            You had the idea. <em className="text-primary">Echo</em> makes sure you see it again.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Capturing is easy. Revisiting is where ideas die. Echo listens, connects your thoughts, and brings
            them back at the right moment.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-8 text-base shadow-record">
              <Link to="/auth">
                <Mic /> Start talking — it's free
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">{FREE_MONTHLY_NOTES} notes a month free · no card needed</span>
          </div>
        </section>

        <section className="mx-auto mb-24 max-w-2xl rounded-3xl border bg-card p-6 shadow-soft md:p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Resurfaced · 3 weeks ago</p>
          <p className="mt-3 font-display text-2xl leading-snug md:text-3xl">
            “What if the garden app sent a nudge the morning before frost? People don't need data, they need a
            reminder.”
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["garden app", "product ideas", "notifications"].map((t) => (
              <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-3xl border bg-border md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="bg-background p-8">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="py-24 text-center">
          <h2 className="font-display text-4xl md:text-5xl">Simple pricing</h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-left md:grid-cols-2">
            <div className="rounded-3xl border p-8">
              <p className="font-medium">Free</p>
              <p className="mt-2 font-display text-5xl">$0</p>
              <p className="mt-4 text-sm text-muted-foreground">{FREE_MONTHLY_NOTES} transcribed notes per month, tagging, linking and resurfacing.</p>
            </div>
            <div className="rounded-3xl border-2 border-primary bg-primary-soft p-8">
              <p className="font-medium text-accent-foreground">Unlimited</p>
              <p className="mt-2 font-display text-5xl">
                $8<span className="font-sans text-base text-muted-foreground">/month</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground">Unlimited transcription and search across everything you've said.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">Echo · think out loud</footer>
    </div>
  );
}
