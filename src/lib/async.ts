export function customSetInterval(fn: () => void, ms: number): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout>;
  let expected = Date.now() + ms;
  const tick = () => {
    if (cancelled) return;
    fn();
    if (cancelled) return;
    expected += ms;
    timer = setTimeout(tick, Math.max(0, expected - Date.now()));
  };
  timer = setTimeout(tick, ms);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

// Guarantees only the most recent request can resolve into state, even if
// the server answers out of order or a request ignores the abort signal.
export function createLatestRequest() {
  let seq = 0;
  let controller: AbortController | null = null;
  return {
    async run<T>(task: (signal: AbortSignal) => Promise<T>): Promise<{ stale: true } | { stale: false; value: T }> {
      controller?.abort();
      const ctrl = new AbortController();
      controller = ctrl;
      const id = ++seq;
      try {
        const value = await task(ctrl.signal);
        return id === seq ? { stale: false, value } : { stale: true };
      } catch (e) {
        if (id !== seq || isAbortError(e)) return { stale: true };
        throw e;
      }
    },
    cancel() {
      seq++;
      controller?.abort();
    },
  };
}

export async function getJSON<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
