import type { NextRequest } from "next/server";
import { getAllExperiences } from "@/lib/data";
import { applyFilters, closestMatches, paramsToFilters } from "@/lib/filters";

const PAGE_SIZE = 40;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const filters = paramsToFilters(params);
  const offset = Math.max(0, Number(params.get("offset")) || 0);

  await sleep(150 + Math.random() * 450);
  if (params.get("fail") === "1") {
    return Response.json({ error: "Search service is temporarily unavailable" }, { status: 503 });
  }

  const experiences = getAllExperiences();
  const all = applyFilters(experiences, filters);
  const closest = all.length === 0 && offset === 0 ? closestMatches(experiences, filters) : null;
  return Response.json({
    total: all.length,
    offset,
    items: all.slice(offset, offset + PAGE_SIZE),
    nextOffset: offset + PAGE_SIZE < all.length ? offset + PAGE_SIZE : null,
    closest: closest && {
      filters: closest.filters,
      dropped: closest.dropped,
      total: closest.items.length,
      items: closest.items.slice(0, 5),
    },
  });
}
