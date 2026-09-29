"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createLatestRequest, getJSON } from "@/lib/async";
import { activeChips, filtersToParams } from "@/lib/filters";
import { EMPTY_FILTERS, type Experience, type Filters } from "@/lib/types";
import { AskAI } from "./AskAI";
import { AvailabilityWidget } from "./AvailabilityWidget";
import { FilterPanel } from "./FilterPanel";
import { ResultsList } from "./ResultsList";
import { SearchBox } from "./SearchBox";

interface SearchResponse {
  total: number;
  items: Experience[];
  nextOffset: number | null;
}

type Status = "loading" | "success" | "error";

export function SearchApp({ initialFilters, aiEnabled }: { initialFilters: Filters; aiEnabled: boolean }) {
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState<(SearchResponse & { key: string }) | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [loadingMoreFor, setLoadingMoreFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Experience | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const pageReq = useRef(createLatestRequest());
  const moreReq = useRef(createLatestRequest());
  const queryString = useMemo(() => filtersToParams(filters).toString(), [filters]);
  const requestKey = `${queryString}#${retryToken}`;

  // Loading is derived: a response only counts once it matches the current request key.
  const status: Status = result?.key === requestKey ? "success" : failure?.key === requestKey ? "error" : "loading";
  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const nextOffset = result?.key === requestKey ? result.nextOffset : null;
  const loadingMore = loadingMoreFor === requestKey;
  const error = failure?.key === requestKey ? failure.message : null;

  useEffect(() => {
    const url = queryString ? `?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [queryString]);

  useEffect(() => {
    moreReq.current.cancel();
    pageReq.current
      .run((signal) => getJSON<SearchResponse>(`/api/search?${queryString}`, signal))
      .then((r) => !r.stale && setResult({ ...r.value, key: requestKey }))
      .catch((e: Error) => setFailure({ key: requestKey, message: e.message }));
  }, [queryString, requestKey]);

  useEffect(() => {
    const req = pageReq.current;
    const more = moreReq.current;
    return () => {
      req.cancel();
      more.cancel();
    };
  }, []);

  const loadMore = useCallback(() => {
    if (nextOffset === null || loadingMore || status !== "success") return;
    const key = requestKey;
    setLoadingMoreFor(key);
    moreReq.current
      .run((signal) => getJSON<SearchResponse>(`/api/search?${queryString ? `${queryString}&` : ""}offset=${nextOffset}`, signal))
      .then((r) => {
        if (r.stale) return;
        setResult((prev) =>
          prev && prev.key === key ? { ...prev, items: [...prev.items, ...r.value.items], nextOffset: r.value.nextOffset } : prev,
        );
        setLoadingMoreFor(null);
      })
      .catch(() => setLoadingMoreFor(null));
  }, [nextOffset, loadingMore, status, queryString, requestKey]);

  const closeWidget = useCallback(() => setSelected(null), []);
  const chips = activeChips(filters);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-bg">D</span>
          <span className="text-lg font-semibold tracking-tight">Discover</span>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
          {aiEnabled ? "AI search: live" : "AI search: offline preview"}
        </span>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <AskAI onApply={(f) => setFilters(f)} currentFilters={filters} />
        <div className="mt-4 flex gap-2">
          <div className="min-w-0 flex-1">
            <SearchBox
              value={filters.q}
              onSubmit={(q) => setFilters((f) => ({ ...f, q }))}
              onPickCity={(city) => setFilters((f) => ({ ...f, city, q: "" }))}
              onPickCategory={(c) =>
                setFilters((f) => ({ ...f, q: "", categories: f.categories.includes(c) ? f.categories : [...f.categories, c] }))
              }
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="filters-panel"
            className="rounded-xl border border-line px-4 text-sm font-medium lg:hidden"
          >
            Filters{chips.length ? ` (${chips.length})` : ""}
          </button>
        </div>
      </section>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilters(chip.remove)}
              className="group inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm text-ink"
              aria-label={`Remove filter ${chip.label}`}
            >
              {chip.label}
              <span aria-hidden className="text-muted group-hover:text-ink">×</span>
            </button>
          ))}
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="px-2 text-sm text-muted underline-offset-2 hover:underline">
            Clear all
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside id="filters-panel" className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          <FilterPanel filters={filters} onChange={setFilters} />
        </aside>

        <main aria-busy={status === "loading"}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {status === "success" && `${total.toLocaleString()} experience${total === 1 ? "" : "s"}`}
              {status === "loading" && "Searching…"}
            </p>
            <label className="flex items-center gap-2 text-sm text-muted">
              Sort
              <select
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as Filters["sort"] }))}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
              >
                <option value="relevance">Best match</option>
                <option value="rating">Top rated</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="duration">Shortest first</option>
              </select>
            </label>
          </div>

          <ResultsList
            status={status}
            items={items}
            error={error}
            hasMore={nextOffset !== null}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            onRetry={() => setRetryToken((t) => t + 1)}
            onClear={() => setFilters(EMPTY_FILTERS)}
            onSelect={setSelected}
          />
        </main>
      </div>

      {selected && <AvailabilityWidget experience={selected} onClose={closeWidget} />}
    </div>
  );
}
