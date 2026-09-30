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
  /** Typical lengths for this kind of experience, in hours. */
  hours: number[];
  /** Typical per-person price range in USD. */
  price: [number, number];
}

const t = (title: string, tags: string[], blurb: string, hours: number[], price: [number, number]): Template => ({
  title,
  tags,
  blurb,
  hours,
  price,
});

const TEMPLATES: Record<Category, Template[]> = {
  "Food & Drink": [
    t("Street Food Walk", ["street food", "local", "walking"], "Eat your way through the neighbourhoods locals actually queue in.", [3, 3.5], [25, 60]),
    t("Wine Tasting Evening", ["wine", "tasting", "sunset", "romantic"], "Small-batch producers, paired bites, and a sommelier who tells good stories.", [2, 2.5, 3], [40, 110]),
    t("Cooking Class with a Local Chef", ["cooking", "market", "hands-on"], "Shop the market in the morning, then cook a full meal from scratch.", [4, 5], [55, 120]),
    t("Coffee Roasters Trail", ["coffee", "roastery", "brunch"], "Three roasteries, one cupping table, zero bad espresso.", [2, 2.5], [25, 55]),
    t("Night Market Crawl", ["night market", "street food", "evening"], "Lanterns, grills and a guide who knows every stall owner.", [2.5, 3], [25, 60]),
    t("Rooftop Dinner at Sunset", ["dinner", "sunset", "romantic", "views"], "A long table above the city, a set menu, and the best light of the day.", [2, 2.5, 3], [60, 150]),
    t("Craft Beer and Bites", ["beer", "brewery", "tasting"], "Taprooms, brewers and the snacks each beer was made for.", [2, 3], [30, 70]),
    t("Pastry and Dessert Tour", ["dessert", "pastry", "walking", "family friendly"], "The city's best sweet things, one small bite at a time.", [2], [25, 55]),
  ],
  Adventure: [
    t("Sunrise Kayak Expedition", ["kayak", "sunrise", "water"], "Paddle out before the crowds and watch the coast wake up.", [3, 4], [50, 120]),
    t("Cliffside Rock Climbing", ["climbing", "cliffs", "beginner friendly"], "Certified guides, all gear included, views that justify the sore arms.", [4, 5, 6], [80, 180]),
    t("Canyon Zipline Circuit", ["zipline", "canyon", "adrenaline"], "Eight lines, one rappel, and a very long lunch afterwards.", [3, 4], [70, 160]),
    t("Mountain Bike Downhill", ["mountain bike", "trail", "adrenaline"], "Shuttle to the top, ride all the way down.", [4, 5], [70, 150]),
    t("Surf Lesson for Beginners", ["surf", "beach", "beginner friendly"], "Small groups, soft boards and a coach in the water with you.", [2, 2.5, 3], [45, 90]),
    t("Tandem Paragliding Flight", ["paragliding", "views", "adrenaline"], "Run, lift off, and see the whole coastline from above.", [2, 3], [120, 240]),
    t("Snorkel and Reef Boat Trip", ["snorkel", "boat", "water", "family friendly"], "Two reef stops, fresh fruit on deck, and gear for every size.", [4, 5, 6], [60, 140]),
    t("Sunset ATV Ride", ["atv", "sunset", "off-road"], "Dusty trails, a ridge-top stop, and golden hour on the way back.", [2, 2.5, 3], [60, 130]),
  ],
  Culture: [
    t("Old Town History Walk", ["history", "walking", "architecture"], "Centuries of stories in an easy two-hour stroll.", [2], [15, 40]),
    t("Behind the Scenes Museum Tour", ["museum", "art", "small group"], "See the restoration studio and the rooms the public never sees.", [2, 2.5, 3], [30, 80]),
    t("Traditional Music and Dance Night", ["music", "dance", "live music", "evening"], "Live performers, a local host and a front-row seat.", [2, 2.5], [25, 70]),
    t("Street Art and Graffiti Tour", ["street art", "photography", "walking"], "Meet the artists behind the murals shaping the skyline.", [2, 2.5, 3], [20, 50]),
    t("Sacred Sites Day Trip", ["temples", "spiritual", "day trip"], "The places that matter most to locals, with time to take them in.", [6, 7, 8], [45, 110]),
    t("Markets and Makers Walk", ["market", "crafts", "local"], "Workshops, stalls and the families who have run them for generations.", [2.5, 3], [20, 50]),
    t("Architecture by Night", ["architecture", "night", "photography", "walking"], "Landmarks lit up, streets quiet, and a guide who knows every facade.", [2], [20, 45]),
    t("Legends and Ghost Stories Walk", ["stories", "night", "walking", "family friendly"], "Folklore, crimes and odd history, told where it happened.", [1.5, 2], [15, 35]),
  ],
  Wellness: [
    t("Sunrise Yoga and Breakfast", ["yoga", "sunrise", "breakfast"], "Gentle flow on a rooftop, followed by a proper breakfast.", [1.5, 2], [25, 55]),
    t("Traditional Spa Ritual", ["spa", "massage", "relaxing"], "A slow, deeply restorative ritual in a historic bathhouse.", [2, 2.5, 3], [60, 160]),
    t("Forest Bathing Retreat", ["forest", "mindfulness", "quiet"], "Unplug, breathe, and walk slowly for once.", [2.5, 3], [30, 70]),
    t("Sound Bath and Meditation", ["meditation", "sound bath", "relaxing"], "Singing bowls, low light and an hour of real rest.", [1, 1.5], [20, 50]),
    t("Sunset Beach Yoga", ["yoga", "sunset", "beach"], "An easy flow on the sand as the sun goes down.", [1.5], [20, 45]),
    t("Hot Springs Soak", ["hot springs", "relaxing", "nature"], "Mineral pools, a quiet valley and nowhere else to be.", [3, 4], [40, 110]),
    t("Couples Massage", ["massage", "couples", "romantic", "relaxing"], "Side-by-side treatments, then tea in the garden.", [1.5, 2], [70, 180]),
    t("Breathwork and Cold Plunge", ["breathwork", "cold plunge", "recovery"], "Guided breathing, an ice bath and a sauna to finish.", [1.5, 2], [35, 80]),
  ],
  Nature: [
    t("Waterfall Hike and Swim", ["hiking", "waterfall", "swimming"], "A moderate trail that ends in a very good swimming hole.", [4, 5, 6], [40, 100]),
    t("Wildlife Spotting Safari", ["wildlife", "birdwatching", "guide"], "Binoculars provided, patience recommended.", [3, 4, 5], [50, 140]),
    t("Summit Sunrise Trek", ["mountain", "sunrise", "trek"], "Start in the dark, summit as the sky turns orange.", [6, 7, 8], [60, 150]),
    t("Stargazing Night Camp", ["stargazing", "camping", "night"], "Zero light pollution and an astronomer with a telescope.", [3, 4], [40, 120]),
    t("Sunset Coastal Walk", ["sunset", "coast", "walking", "easy"], "Cliff paths, hidden coves and the sun dropping into the sea.", [2, 2.5, 3], [20, 45]),
    t("Botanical Garden Tour", ["gardens", "plants", "easy", "family friendly"], "Rare plants, shaded paths and a botanist who loves questions.", [1.5, 2], [15, 35]),
    t("Canopy Walk and Birdsong", ["forest", "birdwatching", "canopy"], "Suspended bridges through the treetops at the liveliest hour.", [2, 3], [30, 70]),
    t("Wildlife Boat Cruise", ["boat", "wildlife", "water"], "A slow cruise with a naturalist, looking for whatever surfaces.", [3, 4], [60, 140]),
  ],
  Nightlife: [
    t("Rooftop Bar Hopping", ["cocktails", "rooftop", "evening"], "Four skyline bars and a bartender who picks your drinks.", [3], [30, 80]),
    t("Live Jazz and Late Dinner", ["jazz", "dinner", "live music", "romantic"], "A tucked-away club, a great trio and a table by the stage.", [3], [50, 120]),
    t("Sunset Sailing Party", ["sailing", "sunset", "drinks"], "Open bar, good playlist, golden hour on the water.", [3], [50, 120]),
    t("Speakeasy Cocktail Trail", ["cocktails", "speakeasy", "hidden bars"], "Unmarked doors, passwords and drinks worth the hunt.", [3], [40, 90]),
    t("Salsa Night with a Lesson", ["dance", "salsa", "live music"], "A quick lesson, a live band, then the floor is yours.", [3], [20, 50]),
    t("Night Food and Bar Crawl", ["bar crawl", "street food", "night"], "Late-night snacks between the bars locals actually go to.", [3, 4], [35, 75]),
    t("Karaoke and Late Bites", ["karaoke", "groups", "late night"], "A private room, a huge song list and plenty to eat.", [2, 3], [25, 60]),
    t("Candlelit Wine Bar Evening", ["wine", "romantic", "live music"], "Natural wines, candlelight and an acoustic set.", [2], [35, 80]),
  ],
  Workshops: [
    t("Pottery Workshop", ["pottery", "craft", "hands-on"], "Throw a bowl on the wheel and take it home once it is fired.", [2, 3], [35, 80]),
    t("Photography Masterclass", ["photography", "walking", "camera"], "Learn to see light from a working photographer.", [3], [45, 110]),
    t("Perfume Making Session", ["perfume", "craft", "hands-on"], "Blend your own scent from a hundred raw materials.", [2], [50, 110]),
    t("Language and Culture Lunch", ["language", "lunch", "local"], "Practice the basics over a home-cooked meal with a host family.", [2, 3], [30, 60]),
    t("Textile Dyeing Studio", ["textiles", "dyeing", "craft"], "Natural dyes, traditional patterns and a scarf to take home.", [3], [40, 90]),
    t("Cocktail Mixology Class", ["cocktails", "mixology", "drinks"], "Shake, stir and taste your way through four classics.", [2], [45, 90]),
    t("Watercolour Sketching Walk", ["painting", "watercolour", "walking"], "Paint the city's corners with an artist beside you.", [2, 3], [30, 70]),
    t("Jewellery Making Class", ["jewellery", "silver", "hands-on"], "Cut, shape and polish a silver ring of your own design.", [3], [55, 120]),
  ],
};

let cache: Experience[] | null = null;

/**
 * A seeded, deterministic catalogue: every city gets each experience type at most once (so no
 * city lists the same title twice), sometimes with a pricier private version alongside it.
 */
export function getAllExperiences(): Experience[] {
  if (cache) return cache;
  const rand = mulberry32(20260930);
  const out: Experience[] = [];
  let n = 0;
  const push = (city: (typeof CITIES)[number], category: Category, tpl: Template, title: string, priceScale: number, tags: string[]) => {
    const [lo, hi] = tpl.price;
    const skew = rand() * rand();
    out.push({
      id: `exp-${++n}`,
      title: `${title} in ${city}`,
      city,
      category,
      price: Math.round(((lo + (hi - lo) * rand()) * priceScale) / 5) * 5,
      durationHours: tpl.hours[Math.floor(rand() * tpl.hours.length)],
      rating: Math.round((3.8 + 1.2 * (1 - skew)) * 10) / 10,
      reviews: 5 + Math.floor(rand() * rand() * 3000),
      tags,
      blurb: tpl.blurb,
      hue: Math.floor(rand() * 360),
    });
  };
  for (const city of CITIES) {
    for (const category of CATEGORIES) {
      for (const tpl of TEMPLATES[category]) {
        if (rand() < 0.1) continue;
        push(city, category, tpl, tpl.title, 1, tpl.tags);
        if (rand() < 0.25) push(city, category, tpl, `Private ${tpl.title}`, 1.8, [...tpl.tags, "private"]);
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
