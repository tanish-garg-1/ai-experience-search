import "server-only";
import Groq from "groq-sdk";
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

/** A fast, cheap text model; supports Groq's strict json_schema mode, which guarantees this shape. */
const MODEL = process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-20b";

let client: Groq | null = null;

export function aiEnabled(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function aiParse(input: string, signal?: AbortSignal): Promise<ParsedQuery> {
  client ??= new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await client.chat.completions.create(
    {
      model: MODEL,
      max_completion_tokens: 2000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "search_filters", strict: true, schema: z.toJSONSchema(ParsedSchema) },
      },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: input },
      ],
    },
    { signal },
  );

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("The model could not interpret this request");
  const p = ParsedSchema.parse(JSON.parse(raw));

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
