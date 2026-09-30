import { describe, expect, it } from "vitest";
import { getAllExperiences } from "../data";
import { applyFilters, closestMatches, filtersToParams, paramsToFilters } from "../filters";
import { heuristicParse, mergeParsed } from "../nlParse";
import { EMPTY_FILTERS, type Filters } from "../types";

describe("URL <-> filters", () => {
  it("round-trips a full filter set", () => {
    const f: Filters = {
      q: "sunset",
      categories: ["Nature", "Wellness"],
      city: "Bali",
      minPrice: 20,
      maxPrice: 90,
      minRating: 4.5,
      maxDurationHours: 4,
      sort: "rating",
    };
    expect(paramsToFilters(filtersToParams(f))).toEqual(f);
  });

  it("drops invalid values instead of trusting the URL", () => {
    const f = paramsToFilters(new URLSearchParams("city=Atlantis&cat=Food%20%26%20Drink,Bogus&rating=9&sort=hack&min=abc"));
    expect(f.city).toBeNull();
    expect(f.categories).toEqual(["Food & Drink"]);
    expect(f.minRating).toBe(5);
    expect(f.sort).toBe("relevance");
    expect(f.minPrice).toBeNull();
  });

  it("serialises empty filters to an empty query string", () => {
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe("");
  });
});

describe("applyFilters", () => {
  const all = getAllExperiences();

  it("respects every constraint", () => {
    const res = applyFilters(all, { ...EMPTY_FILTERS, city: "Lisbon", maxPrice: 60, minRating: 4.5 });
    expect(res.length).toBeGreaterThan(0);
    for (const e of res) {
      expect(e.city).toBe("Lisbon");
      expect(e.price).toBeLessThanOrEqual(60);
      expect(e.rating).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("sorts by price ascending", () => {
    const res = applyFilters(all, { ...EMPTY_FILTERS, sort: "price_asc" });
    for (let i = 1; i < res.length; i++) expect(res[i].price).toBeGreaterThanOrEqual(res[i - 1].price);
  });

  it("ignores filler words like party size in the keyword", () => {
    const base = { ...EMPTY_FILTERS, city: "Bali" as const, q: "sunset" };
    expect(applyFilters(all, { ...base, q: "sunset for two" })).toEqual(applyFilters(all, base));
  });
});

describe("closestMatches", () => {
  const all = getAllExperiences();

  it("loosens the keyword before touching the destination", () => {
    const f = { ...EMPTY_FILTERS, city: "Bali" as const, q: "zzznomatch" };
    expect(applyFilters(all, f)).toEqual([]);
    const closest = closestMatches(all, f)!;
    expect(closest.dropped).toEqual(["“zzznomatch”"]);
    expect(closest.filters.city).toBe("Bali");
    expect(closest.items.every((e) => e.city === "Bali")).toBe(true);
  });

  it("goes over budget before dropping what was asked for, cheapest first", () => {
    const f = { ...EMPTY_FILTERS, city: "Kyoto" as const, q: "jazz", maxPrice: 10 };
    const closest = closestMatches(all, f)!;
    expect(closest.dropped).toEqual(["the price range"]);
    expect(closest.items.every((e) => e.title.toLowerCase().includes("jazz"))).toBe(true);
    const prices = closest.items.map((e) => e.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(closest.filters.sort).toBe("price_asc");
  });

  it("returns null when nothing is active to loosen", () => {
    expect(closestMatches([], EMPTY_FILTERS)).toBeNull();
  });
});

describe("heuristicParse", () => {
  it("extracts city, category, price and duration", () => {
    const p = heuristicParse("relaxing half-day thing in Bali under $80");
    expect(p.city).toBe("Bali");
    expect(p.categories).toContain("Wellness");
    expect(p.maxPrice).toBe(80);
    expect(p.maxDurationHours).toBe(4);
  });

  it("does not read hours as a price", () => {
    const p = heuristicParse("hike under 3 hours");
    expect(p.maxPrice).toBeUndefined();
    expect(p.maxDurationHours).toBe(3);
  });

  it("falls back to keyword search when nothing is recognised", () => {
    const p = heuristicParse("something surprising");
    expect(p.q).toBe("something surprising");
    expect(mergeParsed(p, EMPTY_FILTERS).q).toBe("something surprising");
  });
});
