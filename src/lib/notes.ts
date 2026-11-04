import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Note = {
  id: string;
  title: string;
  summary: string;
  transcript: string;
  tags: string[];
  created_at: string;
  duration_seconds: number;
};

export const notesQuery = queryOptions({
  queryKey: ["notes"],
  queryFn: async (): Promise<Note[]> => {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, summary, transcript, tags, created_at, duration_seconds")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return data;
  },
});

export async function searchNotes(q: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, summary, transcript, tags, created_at, duration_seconds")
    .textSearch("fts", q, { type: "websearch", config: "english" })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}
