import type { NextRequest } from "next/server";
import { suggest } from "@/lib/data";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  // Deliberately jittery so older requests can land after newer ones.
  await sleep(80 + Math.random() * 700);
  return Response.json({ q, suggestions: suggest(q) });
}
