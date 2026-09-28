"use client";

import { useRef, useState } from "react";
import { createLatestRequest } from "@/lib/async";
import { mergeParsed, type ParsedQuery } from "@/lib/nlParse";
import type { Filters } from "@/lib/types";

interface ParseResponse {
  source: "claude" | "offline";
  parsed: ParsedQuery;
  warning?: string;
}

const EXAMPLES = [
  "relaxing half-day thing in Bali under $80",
  "top rated food tours in Lisbon",
  "cheap nightlife in Mexico City, 4.5+ stars",
];

export function AskAI({ onApply, currentFilters }: { onApply: (f: Filters) => void; currentFilters: Filters }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const req = useRef(createLatestRequest());

  async function ask(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const r = await req.current.run(async (signal) => {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
          signal,
        });
        const body = (await res.json()) as ParseResponse & { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Something went wrong");
        return body;
      });
      if (r.stale) return;
      setResult(r.value);
      onApply(mergeParsed(r.value.parsed, currentFilters));
      setPending(false);
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="ask" className="sr-only">
          Describe the experience you want
        </label>
        <input
          id="ask"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe it: “a quiet morning activity in Kyoto under 3 hours”"
          maxLength={300}
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {pending ? "Thinking…" : "Ask AI"}
        </button>
      </form>

      <div className="mt-2 min-h-6 text-sm" aria-live="polite">
        {error && <p className="text-danger">{error}</p>}
        {!error && result && (
          <p className="text-muted">
            <span className="mr-2 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
              {result.source === "claude" ? "Claude" : "offline"}
            </span>
            {result.parsed.explanation}
            {result.warning && <span className="ml-1 text-warn">({result.warning})</span>}
          </p>
        )}
        {!error && !result && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-muted">
            Try:
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setText(ex);
                  ask(ex);
                }}
                className="text-accent underline-offset-2 hover:underline"
              >
                {ex}
              </button>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
