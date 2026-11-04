import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { createParser } from "eventsource-parser";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const BASE_URL = "https://ai.gateway.lovable.dev";
const TRANSCRIBE_MODEL = "openai/gpt-transcribe";
const ANALYZE_MODEL = "openai/gpt-6-astra";
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

export class GatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text);
    return j?.error?.message || j?.message || text;
  } catch {
    return text || res.statusText;
  }
}

export async function transcribeAudio(apiKey: string, file: File, signal?: AbortSignal): Promise<string> {
  if (!file.size || file.size > MAX_AUDIO_BYTES) throw new GatewayError(400, "Recording is empty or too long.");
  if (!file.type.startsWith("audio/")) throw new GatewayError(400, "Unexpected audio format.");
  const form = new FormData();
  form.append("model", TRANSCRIBE_MODEL);
  form.append("file", file, file.name);
  form.append("response_format", "json");
  form.append("stream", "true");
  const res = await fetch(`${BASE_URL}/v1/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal,
  });
  if (!res.ok || !res.body) throw new GatewayError(res.status, await readError(res));

  let deltas = "";
  let final: string | null = null;
  let streamError: string | null = null;
  const parser = createParser({
    onEvent(ev) {
      if (!ev.data || ev.data === "[DONE]") return;
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "transcript.text.delta") deltas += data.delta ?? "";
        else if (data.type === "transcript.text.done") final = data.text ?? deltas;
        else if (data.type === "error" || data.error) streamError = data.error?.message ?? "Transcription failed";
      } catch {
        /* ignore keepalives */
      }
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(value);
  }
  if (streamError) throw new GatewayError(502, streamError);
  const text = (final ?? deltas).trim();
  if (!text) throw new GatewayError(422, "We couldn't hear any words. Try recording again.");
  return text;
}

const analysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
});
export type Analysis = z.infer<typeof analysisSchema>;

export async function analyzeTranscript(
  apiKey: string,
  transcript: string,
  existingTags: string[],
  signal?: AbortSignal,
): Promise<Analysis> {
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: `${BASE_URL}/v1`,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(ANALYZE_MODEL),
    instructions:
      "You organise someone's spoken voice memos into a personal second brain. Given a transcript, return: " +
      "a short evocative title (max 7 words), a 1–2 sentence summary in second person ('You were thinking about…'), " +
      "and 2–5 lowercase topic tags (projects, people, themes; 1–3 words each). " +
      "Strongly prefer reusing an existing tag when the topic matches so ideas link together.",
    messages: [
      {
        role: "user",
        content: `Existing tags: ${existingTags.slice(0, 150).join(", ") || "(none yet)"}\n\nTranscript:\n${transcript.slice(0, 20000)}`,
      },
    ],
    output: Output.object({ schema: analysisSchema }),
    abortSignal: signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    const out = await result.output;
    const tags = [...new Set(out.tags.map((t) => t.toLowerCase().trim()).filter(Boolean))].slice(0, 5);
    return { title: out.title.trim().slice(0, 120) || "Untitled thought", summary: out.summary.trim(), tags };
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) {
      return { title: transcript.split(/\s+/).slice(0, 6).join(" "), summary: "", tags: [] };
    }
    const status = (e as { statusCode?: number })?.statusCode;
    if (status) throw new GatewayError(status, (e as Error).message);
    throw e;
  }
}
