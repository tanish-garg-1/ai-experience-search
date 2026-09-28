import type { NextRequest } from "next/server";
import { getMonthAvailability } from "@/lib/availability";
import { getExperience } from "@/lib/data";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const experience = getExperience(p.get("id") ?? "");
  if (!experience) return Response.json({ error: "Experience not found" }, { status: 404 });

  const year = Number(p.get("year"));
  const month = Number(p.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return Response.json({ error: "Invalid month" }, { status: 400 });
  }

  await sleep(200 + Math.random() * 400);
  return Response.json({ days: getMonthAvailability(experience.id, experience.price, year, month) });
}
