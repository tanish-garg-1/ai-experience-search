export const CATEGORIES = [
  "Food & Drink",
  "Adventure",
  "Culture",
  "Wellness",
  "Nature",
  "Nightlife",
  "Workshops",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CITIES = [
  "Lisbon",
  "Tokyo",
  "Bali",
  "Barcelona",
  "Cape Town",
  "Reykjavik",
  "Marrakech",
  "Bangkok",
  "Mexico City",
  "Kyoto",
  "Istanbul",
  "Cusco",
] as const;
export type City = (typeof CITIES)[number];

export const SORTS = [
  "relevance",
  "price_asc",
  "price_desc",
  "rating",
  "duration",
] as const;
export type Sort = (typeof SORTS)[number];

export interface Experience {
  id: string;
  title: string;
  city: City;
  category: Category;
  price: number;
  durationHours: number;
  rating: number;
  reviews: number;
  tags: string[];
  blurb: string;
  hue: number;
}

export interface Filters {
  q: string;
  categories: Category[];
  city: City | null;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  maxDurationHours: number | null;
  sort: Sort;
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  categories: [],
  city: null,
  minPrice: null,
  maxPrice: null,
  minRating: null,
  maxDurationHours: null,
  sort: "relevance",
};

export type SuggestionType = "city" | "category" | "experience" | "tag";
export interface Suggestion {
  type: SuggestionType;
  label: string;
  hint?: string;
}

export type DayStatus = "available" | "few" | "sold_out";
export interface AvailabilityDay {
  date: string;
  status: DayStatus;
  spots: number;
  price: number;
}
