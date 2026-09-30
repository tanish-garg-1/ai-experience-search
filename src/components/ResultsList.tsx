"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Experience, Filters } from "@/lib/types";

export interface Closest {
  filters: Filters;
  dropped: string[];
  total: number;
  items: Experience[];
}

interface Props {
  status: "loading" | "success" | "error";
  items: Experience[];
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  closest: Closest | null;
  onLoadMore: () => void;
  onRetry: () => void;
  onClear: () => void;
  onRelax: (f: Filters) => void;
  onSelect: (e: Experience) => void;
}

const joinWords = (words: string[]) =>
  words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

export function ResultsList(props: Props) {
  const { status, items, error, closest, onRetry, onClear, onRelax, onSelect } = props;

  if (status === "error") {
    return (
      <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="font-medium">Couldn&apos;t load experiences</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg">
          Try again
        </button>
      </div>
    );
  }

  if (status === "loading" && items.length === 0) {
    return (
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4 rounded-2xl border border-line bg-surface p-3">
            <div className="skeleton h-28 w-28 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
              <div className="skeleton h-3 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (status === "success" && items.length === 0 && closest) {
    return (
      <div>
        <div className="mb-4 rounded-2xl border border-dashed border-line p-5">
          <p className="font-medium">No exact matches — here are the closest ones</p>
          <p className="mt-1 text-sm text-muted">
            These match everything except {joinWords(closest.dropped)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRelax(closest.filters)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
            >
              {closest.total === 1 ? "Use these filters" : `Show all ${closest.total} close matches`}
            </button>
            <button type="button" onClick={onClear} className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
              Clear all filters
            </button>
          </div>
        </div>
        <div role="list" aria-label="Closest matches" className="space-y-3">
          {closest.items.map((e) => (
            <div key={e.id} role="listitem">
              <ExperienceCard experience={e} onSelect={onSelect} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "success" && items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-medium">No experiences match these filters</p>
        <p className="mt-1 text-sm text-muted">Try widening the price range or removing a filter.</p>
        <button type="button" onClick={onClear} className="mt-4 rounded-lg border border-line px-4 py-2 text-sm font-medium">
          Clear all filters
        </button>
      </div>
    );
  }

  return <VirtualList {...props} />;
}

function VirtualList({ status, items, hasMore, loadingMore, onLoadMore, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const update = () => setScrollMargin(listRef.current?.offsetTop ?? 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 148,
    overscan: 6,
    scrollMargin,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = virtualItems.at(-1)?.index ?? -1;

  useEffect(() => {
    if (hasMore && !loadingMore && lastIndex >= items.length - 8) onLoadMore();
  }, [lastIndex, items.length, hasMore, loadingMore, onLoadMore]);

  return (
    <div className={status === "loading" ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <div ref={listRef} role="list" style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualItems.map((row) => {
          const e = items[row.index];
          return (
            <div
              key={e.id}
              role="listitem"
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-3"
              style={{ transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)` }}
            >
              <ExperienceCard experience={e} onSelect={onSelect} />
            </div>
          );
        })}
      </div>
      {loadingMore && <p className="py-4 text-center text-sm text-muted">Loading more…</p>}
      {!hasMore && items.length > 0 && <p className="py-4 text-center text-sm text-muted">You&apos;ve reached the end</p>}
    </div>
  );
}

function ExperienceCard({ experience: e, onSelect }: { experience: Experience; onSelect: (e: Experience) => void }) {
  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-accent">
      <div
        aria-hidden
        className="grid h-28 w-28 shrink-0 place-items-center rounded-xl text-3xl font-semibold text-white/90"
        style={{ background: `linear-gradient(135deg, hsl(${e.hue} 55% 45%), hsl(${(e.hue + 40) % 360} 60% 30%))` }}
      >
        {e.city[0]}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-snug">{e.title}</h3>
          <p className="shrink-0 text-right">
            <span className="font-semibold">${e.price}</span>
            <span className="block text-xs text-muted">per person</span>
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {e.category} · {e.durationHours}h · <span className="text-ink">★ {e.rating.toFixed(1)}</span> ({e.reviews.toLocaleString()})
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{e.blurb}</p>
        <div className="mt-auto flex justify-end pt-2">
          <button
            type="button"
            onClick={() => onSelect(e)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-accent hover:text-accent"
          >
            Check availability
          </button>
        </div>
      </div>
    </article>
  );
}
