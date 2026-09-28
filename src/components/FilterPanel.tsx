"use client";

import { useState } from "react";
import { CATEGORIES, CITIES, type City, type Filters } from "@/lib/types";

const RATINGS = [4, 4.5, 4.8];
const DURATIONS = [2, 4, 8];

function PriceInput({ label, value, onCommit }: { label: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value?.toString() ?? "");
  }
  const commit = () => {
    const n = draft.trim() === "" ? null : Math.max(0, Math.round(Number(draft)));
    onCommit(n === null || Number.isNaN(n) ? null : n);
  };
  return (
    <label className="flex-1 text-xs text-muted">
      {label}
      <div className="mt-1 flex items-center rounded-lg border border-line bg-bg px-2 focus-within:border-accent">
        <span aria-hidden className="text-muted">$</span>
        <input
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-full bg-transparent px-1 py-1.5 text-sm text-ink outline-none"
        />
      </div>
    </label>
  );
}

export function FilterPanel({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const priceError =
    filters.minPrice !== null && filters.maxPrice !== null && filters.minPrice > filters.maxPrice
      ? "Min price is higher than max price"
      : null;

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-surface p-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Destination</legend>
        <select
          value={filters.city ?? ""}
          onChange={(e) => set({ city: (e.target.value || null) as City | null })}
          className="w-full rounded-lg border border-line bg-bg px-2 py-2 text-sm"
          aria-label="Destination"
        >
          <option value="">Anywhere</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Category</legend>
        <div className="space-y-1.5">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.categories.includes(c)}
                onChange={(e) =>
                  set({ categories: e.target.checked ? [...filters.categories, c] : filters.categories.filter((x) => x !== c) })
                }
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Price per person</legend>
        <div className="flex gap-2">
          <PriceInput label="Min" value={filters.minPrice} onCommit={(v) => set({ minPrice: v })} />
          <PriceInput label="Max" value={filters.maxPrice} onCommit={(v) => set({ maxPrice: v })} />
        </div>
        {priceError && (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {priceError}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Rating</legend>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <Toggle key={r} active={filters.minRating === r} onClick={() => set({ minRating: filters.minRating === r ? null : r })}>
              {r}+ ★
            </Toggle>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Duration</legend>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <Toggle
              key={d}
              active={filters.maxDurationHours === d}
              onClick={() => set({ maxDurationHours: filters.maxDurationHours === d ? null : d })}
            >
              ≤ {d}h
            </Toggle>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent-soft text-ink" : "border-line text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
