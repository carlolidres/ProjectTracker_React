import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ITEMS = 40;
const MAX_TEXT_CHARS = 1200;

interface SummaryItem {
  id?: string;
  text?: string;
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() ?? "";
  if (!openaiKey) {
    return jsonResponse(503, { error: "OPENAI_API_KEY is not configured.", summaries: [] });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(500, { error: "Supabase environment is not configured." });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Authentication required." });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonResponse(401, { error: "Authentication required." });
  }

  const body = (await req.json().catch(() => ({}))) as { items?: SummaryItem[] };
  const items = (Array.isArray(body.items) ? body.items : [])
    .map((row) => ({
      id: String(row.id ?? "").trim(),
      text: String(row.text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS),
    }))
    .filter((row) => row.id && row.text)
    .slice(0, MAX_ITEMS);

  if (items.length === 0) {
    return jsonResponse(200, { summaries: [] });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "Shorten pharmaceutical CNF change descriptions for a project card. Return JSON {\"summaries\":[{\"id\":\"\",\"summary\":\"\"}]}. Each summary is 12 words or fewer, factual, no marketing, no invented details. If the source is already short, keep it.",
        },
        {
          role: "user",
          content: JSON.stringify({ items }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return jsonResponse(502, {
      error: "OpenAI request failed.",
      detail: detail.slice(0, 300),
      summaries: [],
    });
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = completion.choices?.[0]?.message?.content ?? "{\"summaries\":[]}";
  let parsed: { summaries?: Array<{ id?: string; summary?: string }> };
  try {
    parsed = JSON.parse(raw) as { summaries?: Array<{ id?: string; summary?: string }> };
  } catch {
    return jsonResponse(200, { summaries: [] });
  }

  const summaries = (Array.isArray(parsed.summaries) ? parsed.summaries : [])
    .map((row) => ({
      id: String(row.id ?? "").trim(),
      summary: String(row.summary ?? "").replace(/\s+/g, " ").trim(),
    }))
    .filter((row) => row.id && row.summary);

  return jsonResponse(200, { summaries });
});
