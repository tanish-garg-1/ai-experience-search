"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createLatestRequest, getJSON } from "@/lib/async";
import { parseISODate, toISODate } from "@/lib/availability";
import type { AvailabilityDay, Experience } from "@/lib/types";

const MONTHS_AHEAD = 5;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; days: AvailabilityDay[] };
type Keyed = { key: string } & ({ status: "error"; message: string } | { status: "ready"; days: AvailabilityDay[] });

export function AvailabilityWidget({ experience, onClose }: { experience: Experience; onClose: () => void }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [loaded, setLoaded] = useState<Keyed | null>(null);
  const [selectedDay, setSelectedDay] = useState<AvailabilityDay | null>(null);
  const selected = selectedDay?.date ?? null;
  const [guests, setGuests] = useState(1);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [retry, setRetry] = useState(0);
  const req = useRef(createLatestRequest());
  const closeRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const r = req.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      r.cancel();
      previous?.focus();
    };
  }, [onClose]);

  const loadKey = `${experience.id}:${cursor.year}-${cursor.month}:${retry}`;
  const load: Load = useMemo(() => (loaded?.key === loadKey ? loaded : { status: "loading" }), [loaded, loadKey]);

  useEffect(() => {
    req.current
      .run((signal) =>
        getJSON<{ days: AvailabilityDay[] }>(
          `/api/availability?id=${experience.id}&year=${cursor.year}&month=${cursor.month}`,
          signal,
        ),
      )
      .then((r) => !r.stale && setLoaded({ key: loadKey, status: "ready", days: r.value.days }))
      .catch((e: Error) => setLoaded({ key: loadKey, status: "error", message: e.message }));
  }, [experience.id, cursor, loadKey]);

  const byDate = useMemo(
    () => new Map(load.status === "ready" ? load.days.map((d) => [d.date, d]) : []),
    [load],
  );
  const maxGuests = selectedDay?.spots ?? 1;

  useEffect(() => {
    if (focusDate) gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate, load]);

  const isFirstMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth();
  const lastAllowed = new Date(today.getFullYear(), today.getMonth() + MONTHS_AHEAD, 1);
  const isLastMonth = cursor.year === lastAllowed.getFullYear() && cursor.month === lastAllowed.getMonth();

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function onGridKey(e: React.KeyboardEvent, date: string) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const d = parseISODate(date);
    d.setDate(d.getDate() + step);
    const next = toISODate(d);
    if (d.getMonth() !== cursor.month) {
      if ((step < 0 && isFirstMonth) || (step > 0 && isLastMonth)) return;
      shiftMonth(step < 0 ? -1 : 1);
    }
    setFocusDate(next);
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const firstWeekday = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const todayKey = toISODate(today);
  const rovingDate =
    focusDate && parseISODate(focusDate).getMonth() === cursor.month
      ? focusDate
      : selected && parseISODate(selected).getMonth() === cursor.month
        ? selected
        : load.status === "ready"
          ? load.days.find((d) => d.status !== "sold_out")?.date ?? null
          : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avail-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Availability</p>
            <h2 id="avail-title" className="mt-1 text-lg font-semibold leading-snug">
              {experience.title}
            </h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-xl text-muted hover:text-ink">
            ×
          </button>
        </div>

        {confirmed && selectedDay ? (
          <div className="mt-8 rounded-2xl bg-accent-soft p-5">
            <p className="font-semibold">Reservation held</p>
            <p className="mt-1 text-sm text-muted">
              {parseISODate(selectedDay.date).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })} ·{" "}
              {guests} guest{guests > 1 ? "s" : ""} · ${selectedDay.price * guests}
            </p>
            <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={isFirstMonth}
                aria-label="Previous month"
                className="rounded-lg border border-line px-3 py-1 disabled:opacity-30"
              >
                ‹
              </button>
              <p className="font-medium" aria-live="polite">
                {monthLabel}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={isLastMonth}
                aria-label="Next month"
                className="rounded-lg border border-line px-3 py-1 disabled:opacity-30"
              >
                ›
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted" aria-hidden>
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {load.status === "error" ? (
              <div role="alert" className="mt-4 rounded-xl border border-line p-4 text-center text-sm">
                <p>{load.message}</p>
                <button type="button" onClick={() => setRetry((r) => r + 1)} className="mt-2 text-accent underline">
                  Retry
                </button>
              </div>
            ) : (
              <div ref={gridRef} role="grid" aria-label={monthLabel} aria-busy={load.status === "loading"} className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: firstWeekday }, (_, i) => (
                  <span key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const date = toISODate(new Date(cursor.year, cursor.month, i + 1));
                  const info = byDate.get(date);
                  const past = date < todayKey;
                  if (load.status === "loading") return <span key={date} className="skeleton aspect-square rounded-lg" />;
                  const disabled = past || !info || info.status === "sold_out";
                  const isSelected = selected === date;
                  const label = `${parseISODate(date).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}, ${
                    past ? "past" : !info ? "unavailable" : info.status === "sold_out" ? "sold out" : `${info.spots} spots, $${info.price}`
                  }`;
                  return (
                    <button
                      key={date}
                      type="button"
                      data-date={date}
                      role="gridcell"
                      aria-label={label}
                      aria-selected={isSelected}
                      aria-disabled={disabled}
                      tabIndex={date === rovingDate ? 0 : -1}
                      onClick={() => {
                        if (disabled || !info) return;
                        setSelectedDay(info);
                        setGuests((g) => Math.min(g, info.spots));
                      }}
                      onKeyDown={(e) => onGridKey(e, date)}
                      onFocus={() => setFocusDate(date)}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-accent font-semibold text-bg"
                          : disabled
                            ? "cursor-not-allowed text-muted/50 line-through"
                            : "hover:bg-accent-soft"
                      }`}
                    >
                      {i + 1}
                      {info && !disabled && !isSelected && (
                        <span
                          aria-hidden
                          className={`absolute bottom-1 h-1 w-1 rounded-full ${info.status === "few" ? "bg-warn" : "bg-accent"}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-warn" /> Few spots</span>
              <span className="line-through">Sold out</span>
            </div>

            <div className="mt-auto border-t border-line pt-4">
              {selectedDay ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {parseISODate(selectedDay.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className={`text-xs ${selectedDay.status === "few" ? "text-warn" : "text-muted"}`}>
                        {selectedDay.status === "few" ? `Only ${selectedDay.spots} left` : `${selectedDay.spots} spots left`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" role="group" aria-label="Guests">
                      <button
                        type="button"
                        onClick={() => setGuests((g) => Math.max(1, g - 1))}
                        disabled={guests <= 1}
                        aria-label="Fewer guests"
                        className="h-8 w-8 rounded-full border border-line disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center" aria-live="polite">{guests}</span>
                      <button
                        type="button"
                        onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                        disabled={guests >= maxGuests}
                        aria-label="More guests"
                        className="h-8 w-8 rounded-full border border-line disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmed(true)}
                    className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-bg"
                  >
                    Reserve · ${selectedDay.price * guests}
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted">Pick a date to see spots and price.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
