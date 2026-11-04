import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordWav, type Recording } from "@/lib/record-wav";
import type { Note } from "@/lib/notes";
import { cn } from "@/lib/utils";

type State = "idle" | "recording" | "processing";

export function Recorder({
  disabled,
  onSaved,
  onLimit,
}: {
  disabled?: boolean;
  onSaved: (note: Note) => void;
  onLimit: () => void;
}) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const rec = useRef<Recording | null>(null);

  useEffect(() => {
    if (state !== "recording") return;
    const start = Date.now();
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
      setLevel(rec.current?.level() ?? 0);
    }, 100);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => () => rec.current?.cancel(), []);

  async function start() {
    if (disabled) return onLimit();
    try {
      rec.current = await recordWav();
      setSeconds(0);
      setState("recording");
    } catch {
      toast.error("Microphone access is needed to record.");
    }
  }

  async function stop() {
    const r = rec.current;
    if (!r) return;
    setState("processing");
    try {
      const { file, seconds: dur } = await r.stop();
      const { data } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("file", file);
      form.append("duration", String(dur));
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 402 && body.code === "limit") {
        onLimit();
        return;
      }
      if (!res.ok) throw new Error(body.error || "Couldn't save that note.");
      onSaved(body.note);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      rec.current = null;
      setState("idle");
    }
  }

  function cancel() {
    rec.current?.cancel();
    rec.current = null;
    setState("idle");
  }

  const mm = String(Math.floor(seconds / 60)).padStart(1, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        {state === "recording" && (
          <span
            className="absolute inset-0 rounded-full bg-primary/20 transition-transform duration-100"
            style={{ transform: `scale(${1.15 + level * 0.6})` }}
          />
        )}
        <button
          type="button"
          onClick={state === "recording" ? stop : start}
          disabled={state === "processing"}
          aria-label={state === "recording" ? "Stop recording" : "Start recording"}
          className={cn(
            "relative flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-record transition-transform hover:scale-105 active:scale-95 disabled:opacity-80",
            state === "idle" && "animate-breathe",
          )}
        >
          {state === "recording" ? (
            <Square className="h-8 w-8 fill-current" />
          ) : state === "processing" ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>
      </div>
      <div className="h-10 text-center">
        {state === "recording" ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg tabular-nums">
              {mm}:{ss}
            </span>
            <button onClick={cancel} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" /> Discard
            </button>
          </div>
        ) : state === "processing" ? (
          <p className="text-sm text-muted-foreground">Listening back, tagging and linking…</p>
        ) : (
          <p className="text-sm text-muted-foreground">Tap and think out loud</p>
        )}
      </div>
    </div>
  );
}
