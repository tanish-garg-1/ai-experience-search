import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLatestRequest, customSetInterval } from "../async";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createLatestRequest", () => {
  it("ignores an older response that arrives after a newer one", async () => {
    const latest = createLatestRequest();
    const slow = deferred<string>();
    const fast = deferred<string>();

    const first = latest.run(() => slow.promise);
    const second = latest.run(() => fast.promise);

    fast.resolve("new");
    slow.resolve("old");

    expect(await second).toEqual({ stale: false, value: "new" });
    expect(await first).toEqual({ stale: true });
  });

  it("aborts the previous request's signal", async () => {
    const latest = createLatestRequest();
    let firstSignal!: AbortSignal;
    latest.run((signal) => {
      firstSignal = signal;
      return new Promise(() => {});
    });
    latest.run(() => Promise.resolve(1));
    expect(firstSignal.aborted).toBe(true);
  });

  it("surfaces errors only from the latest request", async () => {
    const latest = createLatestRequest();
    const failing = latest.run(() => Promise.reject(new Error("boom")));
    await expect(failing).rejects.toThrow("boom");

    let rejectOld!: (e: Error) => void;
    const old = latest.run(() => new Promise((_, reject) => (rejectOld = reject)));
    await latest.run(() => Promise.resolve("ok"));
    rejectOld(new Error("old"));
    expect(await old).toEqual({ stale: true });
  });

  it("cancel() makes an in-flight request stale", async () => {
    const latest = createLatestRequest();
    const d = deferred<number>();
    const p = latest.run(() => d.promise);
    latest.cancel();
    d.resolve(1);
    expect(await p).toEqual({ stale: true });
  });
});

describe("customSetInterval", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires repeatedly until cleared", () => {
    const fn = vi.fn();
    const clear = customSetInterval(fn, 100);
    vi.advanceTimersByTime(350);
    expect(fn).toHaveBeenCalledTimes(3);
    clear();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("can be cleared from inside the callback", () => {
    let clear = () => {};
    const fn = vi.fn(() => clear());
    clear = customSetInterval(fn, 50);
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
