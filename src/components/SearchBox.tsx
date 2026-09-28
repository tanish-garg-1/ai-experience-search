"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createLatestRequest, getJSON } from "@/lib/async";
import type { Category, City, Suggestion } from "@/lib/types";

const DEBOUNCE_MS = 250;

interface Props {
  value: string;
  onSubmit: (q: string) => void;
  onPickCity: (city: City) => void;
  onPickCategory: (category: Category) => void;
}

export function SearchBox({ value, onSubmit, onPickCity, onPickCategory }: Props) {
  const [text, setText] = useState(value);
  const [result, setResult] = useState<{ q: string; suggestions: Suggestion[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = text.trim();
  const suggestions = query.length >= 2 && result?.q === query ? result.suggestions : [];
  const loading = query.length >= 2 && result?.q !== query;
  const req = useRef(createLatestRequest());
  const listId = useId();

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  useEffect(() => {
    if (query.length < 2) {
      req.current.cancel();
      return;
    }
    const timer = setTimeout(() => {
      req.current
        .run((signal) => getJSON<{ suggestions: Suggestion[] }>(`/api/suggest?q=${encodeURIComponent(query)}`, signal))
        .then((r) => {
          if (r.stale) return;
          setResult({ q: query, suggestions: r.value.suggestions });
          setActive(-1);
        })
        .catch(() => setResult({ q: query, suggestions: [] }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const r = req.current;
    return () => r.cancel();
  }, []);

  function pick(s: Suggestion) {
    setOpen(false);
    req.current.cancel();
    if (s.type === "city") onPickCity(s.label as City);
    else if (s.type === "category") onPickCategory(s.label as Category);
    else onSubmit(s.label);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && suggestions[active]) pick(suggestions[active]);
      else {
        setOpen(false);
        req.current.cancel();
        onSubmit(text.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && query.length >= 2;

  return (
    <div className="relative">
      <label htmlFor="search" className="sr-only">
        Search experiences
      </label>
      <input
        id="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder="Or search by keyword, city, or category"
        className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {loading && suggestions.length === 0 && <li className="px-3 py-2 text-sm text-muted">Searching…</li>}
          {!loading && suggestions.length === 0 && <li className="px-3 py-2 text-sm text-muted">No suggestions. Press Enter to search.</li>}
          {suggestions.map((s, i) => (
            <li
              key={`${s.type}:${s.label}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${i === active ? "bg-accent-soft" : ""}`}
            >
              <span>{highlight(s.label, query)}</span>
              {s.hint && <span className="text-xs text-muted">{s.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function highlight(label: string, q: string) {
  const i = label.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0 || !q) return label;
  return (
    <>
      {label.slice(0, i)}
      <mark className="bg-transparent font-semibold text-accent">{label.slice(i, i + q.length)}</mark>
      {label.slice(i + q.length)}
    </>
  );
}
