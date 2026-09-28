import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ParsedQuery } from "./nlParse";
import { CATEGORIES, CITIES, SORTS } from "./types";

const ParsedSchema = z.object({
  q: z.string().nullable().describe("Leftover keywords not captured by any other field, or null"),
  categories: z.array(z.enum(CATEGORIES)),
  city: z.enum(CITIES).nullable(),
  minPrice: z.number().nullable(),
  maxPrice: z.number().nullable(),
  minRating: z.number().nullable(),
  maxDurationHours: z.number().nullable(),
  sort: z.enum(SORTS).nullable(),
  explanation: z.string().describe("One short sentence telling the user how their request was interpreted"),
});

const SYSTEM = `You turn a traveller's free-text request into search filters for an experiences marketplace.
Prices are per person in USD. Durations are in hours. Ratings are 0-5.
Only set a field when the request clearly implies it; otherwise use null (or [] for categories).
Map vibes to categories, e.g. "relaxing" -> Wellness, "foodie" -> Food & Drink, "outdoorsy" -> Nature or Adventure.
If a city is not in the allowed list, leave city null and mention that in the explanation.
Put only genuinely leftover keywords in q.`;

let client: Anthropic | null = null;

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function aiParse(input: string, signal?: AbortSignal): Promise<ParsedQuery> {
  client ??= new Anthropic();
  const response = await client.beta.messages.parse(
    {
      model: "claude-opus-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(ParsedSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: input }],
    },
    { signal },
  );
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("The model could not interpret this request");
  }
  const p = response.parsed_output;
  return {
    q: p.q ?? undefined,
    categories: p.categories,
    city: p.city ?? undefined,
    minPrice: p.minPrice ?? undefined,
    maxPrice: p.maxPrice ?? undefined,
    minRating: p.minRating ?? undefined,
    maxDurationHours: p.maxDurationHours ?? undefined,
    sort: p.sort ?? undefined,
    explanation: p.explanation,
  };
}
