import { aiEnabled, aiParse } from "@/lib/aiParse";
import { heuristicParse } from "@/lib/nlParse";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 300) : "";
  if (!query) return Response.json({ error: "Describe what you're looking for" }, { status: 400 });

  if (!aiEnabled()) {
    return Response.json({ source: "offline", parsed: heuristicParse(query) });
  }

  // A visitor who keeps hammering "Ask AI" falls back to the offline parser instead of eating
  // everyone else's share of the (shared, free-tier) Groq quota.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = rateLimit(ip, 10, 10 * 60_000);
  if (!limit.ok) {
    return Response.json({ source: "offline", parsed: heuristicParse(query), warning: "Too many AI requests, used the offline parser" });
  }

  try {
    return Response.json({ source: "groq", parsed: await aiParse(query, req.signal) });
  } catch (error) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      return Response.json({ source: "offline", parsed: heuristicParse(query), warning: "AI is busy, used the offline parser" });
    }
    if (typeof status === "number") {
      console.error(`Groq API error ${status}:`, (error as Error).message);
    } else {
      console.error(error);
    }
    return Response.json({ source: "offline", parsed: heuristicParse(query), warning: "AI unavailable, used the offline parser" });
  }
}
