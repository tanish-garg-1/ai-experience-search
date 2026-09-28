import { hashString } from "./data";
import type { AvailabilityDay, DayStatus } from "./types";

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getMonthAvailability(
  experienceId: string,
  basePrice: number,
  year: number,
  month: number,
  today: Date = new Date(),
): AvailabilityDay[] {
  const todayKey = toISODate(today);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const out: AvailabilityDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = toISODate(new Date(year, month, day));
    if (date < todayKey) continue;
    const h = hashString(`${experienceId}:${date}`);
    const weekday = new Date(year, month, day).getDay();
    const weekend = weekday === 0 || weekday === 6;
    const roll = h % 100;
    let status: DayStatus = "available";
    let spots = 4 + (h % 9);
    if (roll < (weekend ? 22 : 10)) {
      status = "sold_out";
      spots = 0;
    } else if (roll < (weekend ? 45 : 28)) {
      status = "few";
      spots = 1 + (h % 3);
    }
    out.push({ date, status, spots, price: weekend ? Math.round(basePrice * 1.15) : basePrice });
  }
  return out;
}
