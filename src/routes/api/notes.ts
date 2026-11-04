import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { canRecord, startOfMonthUTC } from "@/lib/plan";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export const Route = createFileRoute("/api/notes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Please sign in." }, 401);

        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", key);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return json({ error: "Please sign in again." }, 401);
        const userId = userData.user.id;

        const len = Number(request.headers.get("content-length") ?? 0);
        if (len > 25 * 1024 * 1024) return json({ error: "Recording is too long. Keep it under ~12 minutes." }, 413);

        const { count } = await supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfMonthUTC(new Date()).toISOString());
        if (!canRecord("free", count ?? 0)) {
          return json({ error: "You've used all your free notes this month.", code: "limit" }, 402);
        }

        const form = await request.formData();
        const file = form.get("file");
        const duration = Math.round(Number(form.get("duration") ?? 0));
        if (!(file instanceof File)) return json({ error: "No recording received." }, 400);

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "AI is not configured." }, 500);

        const { transcribeAudio, analyzeTranscript, GatewayError } = await import("@/lib/ai/notes-ai.server");
        try {
          const transcript = await transcribeAudio(apiKey, file, request.signal);
          const { data: tagRows } = await supabase.from("notes").select("tags").limit(300);
          const existing = [...new Set((tagRows ?? []).flatMap((r) => r.tags))];
          const analysis = await analyzeTranscript(apiKey, transcript, existing, request.signal);
          const { data: note, error } = await supabase
            .from("notes")
            .insert({ user_id: userId, transcript, duration_seconds: duration, ...analysis })
            .select("id, title, summary, tags, created_at, transcript, duration_seconds")
            .single();
          if (error) return json({ error: error.message }, 500);
          return json({ note });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          if (e instanceof GatewayError) {
            const msg =
              e.status === 402
                ? "AI credits have run out. Please try again later."
                : e.status === 429
                  ? "Too many requests right now — try again in a moment."
                  : e.message;
            return json({ error: msg }, e.status >= 400 && e.status < 600 ? e.status : 502);
          }
          console.error(e);
          return json({ error: "Something went wrong processing your note." }, 500);
        }
      },
    },
  },
});
