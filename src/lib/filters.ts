import {
  CATEGORIES,
  CITIES,
  EMPTY_FILTERS,
  SORTS,
  type Category,
  type City,
  type Experience,
  type Filters,
  type Sort,
} from "./types";

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function read(source: ParamSource, key: string): string | null {
  if (source instanceof URLSearchParams) return source.get(key);
  const value = source[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function num(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

export function paramsToFilters(source: ParamSource): Filters {
  const cats = (read(source, "cat") ?? "")
    .split(",")
    .filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c));
  const city = read(source, "city");
  const sort = read(source, "sort");
  return {
    q: (read(source, "q") ?? "").slice(0, 120),
    categories: [...new Set(cats)],
    city: (CITIES as readonly string[]).includes(city ?? "") ? (city as City) : null,
    minPrice: num(read(source, "min"), 0, 10_000),
    maxPrice: num(read(source, "max"), 0, 10_000),
    minRating: num(read(source, "rating"), 0, 5),
    maxDurationHours: num(read(source, "dur"), 0.5, 24),
    sort: (SORTS as readonly string[]).includes(sort ?? "")
      ? (sort as Sort)
      : EMPTY_FILTERS.sort,
  };
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.categories.length) p.set("cat", f.categories.join(","));
  if (f.city) p.set("city", f.city);
  if (f.minPrice !== null) p.set("min", String(f.minPrice));
  if (f.maxPrice !== null) p.set("max", String(f.maxPrice));
  if (f.minRating !== null) p.set("rating", String(f.minRating));
  if (f.maxDurationHours !== null) p.set("dur", String(f.maxDurationHours));
  if (f.sort !== "relevance") p.set("sort", f.sort);
  return p;
}

export interface Chip {
  key: string;
  label: string;
  remove: (f: Filters) => Filters;
}

export function activeChips(f: Filters): Chip[] {
  const chips: Chip[] = [];
  if (f.q.trim())
    chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: (x) => ({ ...x, q: "" }) });
  if (f.city)
    chips.push({ key: "city", label: f.city, remove: (x) => ({ ...x, city: null }) });
  for (const c of f.categories)
    chips.push({
      key: `cat:${c}`,
      label: c,
      remove: (x) => ({ ...x, categories: x.categories.filter((y) => y !== c) }),
    });
  if (f.minPrice !== null)
    chips.push({ key: "min", label: `From $${f.minPrice}`, remove: (x) => ({ ...x, minPrice: null }) });
  if (f.maxPrice !== null)
    chips.push({ key: "max", label: `Up to $${f.maxPrice}`, remove: (x) => ({ ...x, maxPrice: null }) });
  if (f.minRating !== null)
    chips.push({ key: "rating", label: `${f.minRating}+ stars`, remove: (x) => ({ ...x, minRating: null }) });
  if (f.maxDurationHours !== null)
    chips.push({
      key: "dur",
      label: `Up to ${f.maxDurationHours}h`,
      remove: (x) => ({ ...x, maxDurationHours: null }),
    });
  return chips;
}

// Words people naturally type that never describe the activity itself ("for two", "a nice thing to do").
// Requiring them to appear in a listing would wipe out otherwise good matches.
const STOPWORDS = new Set(
  "a an and any are at be best but by can do for from get go good great i in into is it me my near nice of on one or our some something somewhere that the thing things this to two three four we with want looking find experience experiences activity activities trip tour tours people person couple family friends kids day days".split(" "),
);

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t));

function textScore(e: Experience, tokens: string[]): number {
  if (!tokens.length) return 1;
  const title = e.title.toLowerCase();
  const haystack = `${title} ${e.city.toLowerCase()} ${e.category.toLowerCase()} ${e.tags.join(" ").toLowerCase()} ${e.blurb.toLowerCase()}`;
  let score = 0;
  for (const t of tokens) {
    if (!haystack.includes(t)) return 0;
    score += title.includes(t) ? 3 : 1;
  }
  return score;
}

export function applyFilters(all: Experience[], f: Filters): Experience[] {
  const tokens = tokenize(f.q);
  const scored: { e: Experience; score: number }[] = [];
  for (const e of all) {
    if (f.categories.length && !f.categories.includes(e.category)) continue;
    if (f.city && e.city !== f.city) continue;
    if (f.minPrice !== null && e.price < f.minPrice) continue;
    if (f.maxPrice !== null && e.price > f.maxPrice) continue;
    if (f.minRating !== null && e.rating < f.minRating) continue;
    if (f.maxDurationHours !== null && e.durationHours > f.maxDurationHours) continue;
    const score = textScore(e, tokens);
    if (score === 0) continue;
    scored.push({ e, score });
  }
  const by: Record<Sort, (a: { e: Experience; score: number }, b: { e: Experience; score: number }) => number> = {
    relevance: (a, b) => b.score - a.score || b.e.rating - a.e.rating || b.e.reviews - a.e.reviews,
    price_asc: (a, b) => a.e.price - b.e.price,
    price_desc: (a, b) => b.e.price - a.e.price,
    rating: (a, b) => b.e.rating - a.e.rating || b.e.reviews - a.e.reviews,
    duration: (a, b) => a.e.durationHours - b.e.durationHours,
  };
  return scored.sort(by[f.sort]).map((x) => x.e);
}

/**
 * Drop order when nothing matches: practical limits first, then what was asked for, the destination
 * last. Someone after a jazz night in Kyoto would rather see one slightly over budget than karaoke.
 */
const RELAX_STEPS: { label: (f: Filters) => string | null; drop: (f: Filters) => Filters }[] = [
  { label: (f) => (f.minRating !== null ? `${f.minRating}+ stars` : null), drop: (f) => ({ ...f, minRating: null }) },
  { label: (f) => (f.maxDurationHours !== null ? `up to ${f.maxDurationHours}h` : null), drop: (f) => ({ ...f, maxDurationHours: null }) },
  {
    label: (f) => (f.minPrice !== null || f.maxPrice !== null ? "the price range" : null),
    drop: (f) => ({ ...f, minPrice: null, maxPrice: null }),
  },
  { label: (f) => (tokenize(f.q).length ? `“${f.q.trim()}”` : null), drop: (f) => ({ ...f, q: "" }) },
  { label: (f) => (f.categories.length ? f.categories.join(" / ") : null), drop: (f) => ({ ...f, categories: [] }) },
  { label: (f) => f.city, drop: (f) => ({ ...f, city: null }) },
];

export interface Closest {
  filters: Filters;
  dropped: string[];
  items: Experience[];
}

/** When the exact filters match nothing, loosen them one step at a time until something does. */
export function closestMatches(all: Experience[], f: Filters): Closest | null {
  let current = f;
  const dropped: string[] = [];
  for (const step of RELAX_STEPS) {
    const label = step.label(current);
    if (!label) continue;
    current = step.drop(current);
    dropped.push(label);
    const items = applyFilters(all, current);
    if (!items.length) continue;
    // Over budget, the closest options are the least over budget.
    if (f.maxPrice !== null && current.maxPrice === null) {
      current = { ...current, sort: "price_asc" };
      items.sort((a, b) => a.price - b.price);
    }
    return { filters: current, dropped, items };
  }
  return null;
}
