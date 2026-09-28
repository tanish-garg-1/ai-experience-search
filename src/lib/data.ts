import { CATEGORIES, CITIES, type Category, type Experience, type Suggestion } from "./types";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Template {
  title: string;
  tags: string[];
  blurb: string;
}

const TEMPLATES: Record<Category, Template[]> = {
  "Food & Drink": [
    { title: "Street Food Walk", tags: ["street food", "local", "walking"], blurb: "Eat your way through the neighbourhoods locals actually queue in." },
    { title: "Wine Tasting Evening", tags: ["wine", "tasting", "sunset"], blurb: "Small-batch producers, paired bites, and a sommelier who tells good stories." },
    { title: "Cooking Class with a Local Chef", tags: ["cooking", "market", "hands-on"], blurb: "Shop the market at sunrise, then cook a full meal from scratch." },
    { title: "Coffee Roasters Trail", tags: ["coffee", "roastery", "brunch"], blurb: "Three roasteries, one cupping table, zero bad espresso." },
    { title: "Night Market Crawl", tags: ["night market", "street food", "evening"], blurb: "Lanterns, grills and a guide who knows every stall owner." },
  ],
  Adventure: [
    { title: "Sunrise Kayak Expedition", tags: ["kayak", "sunrise", "water"], blurb: "Paddle out before the crowds and watch the coast wake up." },
    { title: "Cliffside Rock Climbing", tags: ["climbing", "cliffs", "beginner friendly"], blurb: "Certified guides, all gear included, views that justify the sore arms." },
    { title: "Canyon Zipline Circuit", tags: ["zipline", "canyon", "adrenaline"], blurb: "Eight lines, one rappel, and a very long lunch afterwards." },
    { title: "Mountain Bike Downhill", tags: ["mountain bike", "trail", "adrenaline"], blurb: "Shuttle to the top, ride all the way down." },
  ],
  Culture: [
    { title: "Old Town History Walk", tags: ["history", "walking", "architecture"], blurb: "Centuries of stories in an easy two-hour stroll." },
    { title: "Behind the Scenes Museum Tour", tags: ["museum", "art", "private"], blurb: "See the restoration studio and the rooms the public never sees." },
    { title: "Traditional Music and Dance Night", tags: ["music", "dance", "evening"], blurb: "Live performers, a local host and a front-row seat." },
    { title: "Street Art and Graffiti Tour", tags: ["street art", "photography", "walking"], blurb: "Meet the artists behind the murals shaping the skyline." },
  ],
  Wellness: [
    { title: "Sunrise Yoga and Breakfast", tags: ["yoga", "sunrise", "breakfast"], blurb: "Gentle flow on a rooftop, followed by a proper breakfast." },
    { title: "Traditional Spa Ritual", tags: ["spa", "massage", "relaxing"], blurb: "A slow, deeply restorative half day in a historic bathhouse." },
    { title: "Forest Bathing Retreat", tags: ["forest", "mindfulness", "quiet"], blurb: "Unplug, breathe, and walk slowly for once." },
  ],
  Nature: [
    { title: "Waterfall Hike and Swim", tags: ["hiking", "waterfall", "swimming"], blurb: "A moderate trail that ends in a very good swimming hole." },
    { title: "Wildlife Spotting Safari", tags: ["wildlife", "birdwatching", "guide"], blurb: "Binoculars provided, patience recommended." },
    { title: "Volcano Sunrise Trek", tags: ["volcano", "sunrise", "trek"], blurb: "Start in the dark, summit as the sky turns orange." },
    { title: "Stargazing Night Camp", tags: ["stargazing", "camping", "night"], blurb: "Zero light pollution and an astronomer with a telescope." },
  ],
  Nightlife: [
    { title: "Rooftop Bar Hopping", tags: ["cocktails", "rooftop", "evening"], blurb: "Four skyline bars and a bartender who picks your drinks." },
    { title: "Live Jazz and Late Dinner", tags: ["jazz", "dinner", "live music"], blurb: "A tucked-away club, a great trio and a table by the stage." },
    { title: "Sunset Sailing Party", tags: ["sailing", "sunset", "drinks"], blurb: "Open bar, good playlist, golden hour on the water." },
  ],
  Workshops: [
    { title: "Pottery Workshop", tags: ["pottery", "craft", "hands-on"], blurb: "Throw a bowl on the wheel and take it home once it is fired." },
    { title: "Photography Masterclass", tags: ["photography", "walking", "camera"], blurb: "Learn to see light from a working photographer." },
    { title: "Perfume Making Session", tags: ["perfume", "craft", "hands-on"], blurb: "Blend your own scent from a hundred raw materials." },
    { title: "Language and Culture Lunch", tags: ["language", "lunch", "local"], blurb: "Practice the basics over a home-cooked meal with a host family." },
  ],
};

const PRICE_RANGE: Record<Category, [number, number]> = {
  "Food & Drink": [25, 120],
  Adventure: [45, 220],
  Culture: [15, 80],
  Wellness: [30, 160],
  Nature: [30, 180],
  Nightlife: [20, 110],
  Workshops: [30, 130],
};

let cache: Experience[] | null = null;

export function getAllExperiences(): Experience[] {
  if (cache) return cache;
  const rand = mulberry32(20260928);
  const out: Experience[] = [];
  let n = 0;
  for (const city of CITIES) {
    for (const category of CATEGORIES) {
      const templates = TEMPLATES[category];
      const count = 5 + Math.floor(rand() * 6);
      for (let i = 0; i < count; i++) {
        const t = templates[Math.floor(rand() * templates.length)];
        const [lo, hi] = PRICE_RANGE[category];
        const durationHours = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8][Math.floor(rand() * 9)];
        const skew = rand() * rand();
        out.push({
          id: `exp-${++n}`,
          title: `${t.title} in ${city}`,
          city,
          category,
          price: Math.round((lo + (hi - lo) * rand()) / 5) * 5,
          durationHours,
          rating: Math.round((3.8 + 1.2 * (1 - skew)) * 10) / 10,
          reviews: 5 + Math.floor(rand() * rand() * 3000),
          tags: t.tags,
          blurb: t.blurb,
          hue: Math.floor(rand() * 360),
        });
      }
    }
  }
  cache = out;
  return out;
}

export function getExperience(id: string): Experience | undefined {
  return getAllExperiences().find((e) => e.id === id);
}

export function suggest(query: string, limit = 8): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: Suggestion[] = [];

  for (const city of CITIES)
    if (city.toLowerCase().startsWith(q)) out.push({ type: "city", label: city, hint: "Destination" });
  for (const cat of CATEGORIES)
    if (cat.toLowerCase().includes(q)) out.push({ type: "category", label: cat, hint: "Category" });

  const tags = new Map<string, number>();
  const titles = new Map<string, number>();
  for (const e of getAllExperiences()) {
    for (const tag of e.tags) if (tag.startsWith(q) || tag.split(" ").some((w) => w.startsWith(q))) tags.set(tag, (tags.get(tag) ?? 0) + 1);
    if (e.title.toLowerCase().includes(q)) {
      const key = e.title.replace(/ in .+$/, "");
      titles.set(key, (titles.get(key) ?? 0) + 1);
    }
  }
  for (const [tag, count] of [...tags].sort((a, b) => b[1] - a[1]).slice(0, 3))
    out.push({ type: "tag", label: tag, hint: `${count} experiences` });
  for (const [title, count] of [...titles].sort((a, b) => b[1] - a[1]).slice(0, 4))
    out.push({ type: "experience", label: title, hint: `${count} listings` });

  return out.slice(0, limit);
}
