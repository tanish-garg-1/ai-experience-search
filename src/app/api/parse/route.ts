import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled, aiParse } from "@/lib/aiParse";
import { heuristicParse } from "@/lib/nlParse";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 300) : "";
  if (!query) return Response.json({ error: "Describe what you're looking for" }, { status: 400 });

  if (!aiEnabled()) {
    return Response.json({ source: "offline", parsed: heuristicParse(query) });
  }

  try {
    return Response.json({ source: "claude", parsed: await aiParse(query, req.signal) });
  } catch (error) {
    if (error instanceof Anthropic.APIUserAbortError) return new Response(null, { status: 499 });
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ source: "offline", parsed: heuristicParse(query), warning: "AI is busy, used the offline parser" });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude API error ${error.status}:`, error.message);
    } else {
      console.error(error);
    }
    return Response.json({ source: "offline", parsed: heuristicParse(query), warning: "AI unavailable, used the offline parser" });
  }
}
