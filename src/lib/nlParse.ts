import { CATEGORIES, CITIES, type Category, type Filters, type Sort } from "./types";

export type ParsedQuery = Partial<Omit<Filters, "sort">> & { sort?: Sort; explanation: string };

const CATEGORY_WORDS: Record<Category, string[]> = {
  "Food & Drink": ["food", "eat", "cooking", "wine", "coffee", "street food", "dinner", "tasting", "foodie"],
  Adventure: ["adventure", "kayak", "climb", "zipline", "adrenaline", "bike", "thrill"],
  Culture: ["culture", "history", "museum", "art", "architecture", "heritage"],
  Wellness: ["wellness", "yoga", "spa", "massage", "relax", "relaxing", "mindful", "quiet", "calm"],
  Nature: ["nature", "hike", "hiking", "waterfall", "wildlife", "volcano", "stargazing", "outdoors"],
  Nightlife: ["nightlife", "bar", "bars", "cocktail", "cocktails", "party", "jazz", "drinks"],
  Workshops: ["workshop", "class", "pottery", "photography", "craft", "learn"],
};

export function heuristicParse(input: string): ParsedQuery {
  const text = ` ${input.toLowerCase()} `;
  const out: ParsedQuery = { explanation: "" };
  const notes: string[] = [];

  const city = CITIES.find((c) => text.includes(c.toLowerCase()));
  if (city) {
    out.city = city;
    notes.push(`in ${city}`);
  }

  const categories = CATEGORIES.filter((c) =>
    CATEGORY_WORDS[c].some((w) => new RegExp(`\\b${w}\\b`).test(text)),
  );
  if (categories.length) {
    out.categories = categories;
    notes.push(categories.join(" or "));
  }

  const under = text.match(/(?:under|below|less than|max|cheaper than|up to|<)\s*\$?\s*(\d+)(?!\s*(?:h|hr|hrs|hour))/);
  if (under) out.maxPrice = Number(under[1]);
  else if (/\b(cheap|budget|affordable)\b/.test(text)) out.maxPrice = 50;
  const over = text.match(/(?:over|above|more than|from)\s*\$\s*(\d+)/);
  if (over) out.minPrice = Number(over[1]);
  if (out.maxPrice !== undefined) notes.push(`under $${out.maxPrice}`);

  const hours = text.match(/(?:under|less than|up to|within|max|<)\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\b/);
  if (hours) out.maxDurationHours = Number(hours[1]);
  else if (/\b(quick|short)\b/.test(text)) out.maxDurationHours = 2;
  else if (/\bhalf[- ]day\b/.test(text)) out.maxDurationHours = 4;
  if (out.maxDurationHours !== undefined) notes.push(`${out.maxDurationHours}h or less`);

  const stars = text.match(/(\d(?:\.\d)?)\s*\+?\s*(?:stars?|rated)/);
  if (stars) out.minRating = Math.min(5, Number(stars[1]));
  else if (/\b(top rated|best|highly rated)\b/.test(text)) out.minRating = 4.7;
  if (out.minRating !== undefined) notes.push(`${out.minRating}+ stars`);

  if (/\bcheapest\b/.test(text)) out.sort = "price_asc";
  else if (/\b(top rated|best|highly rated)\b/.test(text)) out.sort = "rating";

  out.explanation = notes.length
    ? `Looking for experiences ${notes.join(", ")}.`
    : "Couldn't pick out specific filters, so this is a keyword search.";
  if (!notes.length) out.q = input.trim().slice(0, 120);
  return out;
}

export function mergeParsed(parsed: ParsedQuery, base: Filters): Filters {
  return {
    ...base,
    q: parsed.q ?? "",
    categories: parsed.categories ?? [],
    city: parsed.city ?? null,
    minPrice: parsed.minPrice ?? null,
    maxPrice: parsed.maxPrice ?? null,
    minRating: parsed.minRating ?? null,
    maxDurationHours: parsed.maxDurationHours ?? null,
    sort: parsed.sort ?? "relevance",
  };
}
