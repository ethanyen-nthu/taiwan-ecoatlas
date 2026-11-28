import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * public/sw.js is plain JavaScript that runs in a browser worker, so it is
 * loaded here into a fake worker scope with an in-memory cache and a fake
 * network, and driven with fake fetch events.
 */
const source = readFileSync(
  path.join(import.meta.dirname, "..", "public", "sw.js"),
  "utf8",
);
const origin = "https://eco.test";

type Handler = (event: unknown) => void;
interface Req {
  url: string;
  method: string;
  mode: string;
}
const req = (pathname: string, extra: Partial<Req> = {}): Req => ({
  url: pathname.startsWith("http") ? pathname : origin + pathname,
  method: "GET",
  mode: "cors",
  ...extra,
});
const nav = (pathname: string) => req(pathname, { mode: "navigate" });

class FakeCache {
  entries = new Map<string, Response>();
  constructor(private fetcher: (r: Req) => Promise<Response>) {}
  async match(request: Req | string, options: { ignoreSearch?: boolean } = {}) {
    const key = typeof request === "string" ? origin + request : request.url;
    if (!options.ignoreSearch) return this.entries.get(key)?.clone();
    const bare = (url: string) => url.split("?")[0];
    for (const [url, response] of this.entries)
      if (bare(url) === bare(key)) return response.clone();
    return undefined;
  }
  async put(request: Req | string, response: Response) {
    const key =
      typeof request === "string"
        ? request.startsWith("/")
          ? origin + request
          : request
        : request.url;
    this.entries.delete(key); // a put re-adds at the end, as a real cache does
    this.entries.set(key, response);
  }
  async add(url: string) {
    const response = await this.fetcher(req(url));
    await this.put(origin + url, response);
  }
  async keys() {
    return [...this.entries.keys()].map((url) => ({ url }));
  }
  async delete(request: { url: string }) {
    return this.entries.delete(request.url);
  }
}

function makeWorker() {
  const handlers: Record<string, Handler> = {};
  const stores = new Map<string, FakeCache>();
  let network: (r: Req) => Promise<Response> = async () => {
    throw new TypeError("offline");
  };
  const calls: string[] = [];
  const fetcher = (input: Req | string) => {
    const r = typeof input === "string" ? req(input) : input;
    calls.push(r.url);
    return network(r);
  };
  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new FakeCache(fetcher));
      return stores.get(name)!;
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    async match(url: string) {
      for (const cache of stores.values()) {
        const hit = await cache.match(url);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  const scope = {
    location: { origin },
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  } as Record<string, unknown>;
  vm.runInNewContext(source, {
    self: scope,
    caches,
    fetch: fetcher,
    Response,
    Headers,
    URL,
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
  const worker = scope.ecoatlasWorker as {
    kindOf: (r: Req) => string | null;
    worthKeeping: (path: string, body: unknown) => boolean;
    OFFLINE_URL: string;
    WAIT_MS: number;
  };
  /** Fire a fetch event; resolves with the answer (undefined if the worker
   *  left the request alone) once background work has settled too. */
  async function fetchEvent(request: Req) {
    const waits: Promise<unknown>[] = [];
    let answer: Promise<Response> | undefined;
    handlers.fetch({
      request,
      respondWith: (p: Promise<Response>) => {
        answer = p;
      },
      waitUntil: (p: Promise<unknown>) => waits.push(p),
    });
    const result = answer ? await answer.catch((e: unknown) => e) : undefined;
    // Background writes can add more waits while others settle.
    for (let i = 0; i < 5; i++) await Promise.allSettled([...waits]);
    return result;
  }
  async function lifecycle(type: "install" | "activate") {
    const waits: Promise<unknown>[] = [];
    handlers[type]({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  }
  return {
    worker,
    scope,
    stores,
    calls,
    setNetwork: (fn: (r: Req) => Promise<Response>) => {
      network = fn;
    },
    fetchEvent,
    lifecycle,
    cache: (name: string) => stores.get(name),
  };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
const html = (text: string) =>
  new Response(text, { headers: { "content-type": "text/html" } });

const goodToday = {
  air: { status: "fresh" },
  weather: { status: "fresh" },
  reservoirs: { status: "unavailable" },
};
const nothingToday = {
  air: { status: "unavailable" },
  weather: { status: "unavailable" },
  reservoirs: { status: "not-configured" },
};

describe("which requests the worker handles", () => {
  const { worker } = makeWorker();
  it("takes over only the live feeds, build files, boundaries and page loads", () => {
    for (const p of [
      "/api/today",
      "/api/hazards",
      "/api/reservoirs",
      "/api/observations/aqi",
      "/api/observations/weather",
    ])
      expect(worker.kindOf(req(p))).toBe("live");
    expect(worker.kindOf(req("/_next/static/chunks/a-1f3.js"))).toBe("static");
    expect(worker.kindOf(req("/data/counties.geojson"))).toBe("boundaries");
    expect(worker.kindOf(nav("/county/63000"))).toBe("page");
  });

  it("leaves everything else alone", () => {
    expect(worker.kindOf(req("/api/atlas/wildlife"))).toBeNull();
    expect(worker.kindOf(req("/api/observations/other"))).toBeNull();
    expect(worker.kindOf(req("/api/today/extra"))).toBeNull();
    expect(worker.kindOf(req("/county/63000?_rsc=abc"))).toBeNull();
    expect(worker.kindOf(req("/data/atlas/forests.json"))).toBeNull();
    expect(worker.kindOf(req("/sw.js"))).toBeNull();
    expect(worker.kindOf(req("/api/today", { method: "POST" }))).toBeNull();
    expect(worker.kindOf(req("https://tiles.example/api/today"))).toBeNull();
    expect(worker.kindOf(nav("https://elsewhere.example/"))).toBeNull();
  });

  it("saves a response only if some part of it holds real readings", () => {
    expect(worker.worthKeeping("/api/today", goodToday)).toBe(true);
    expect(worker.worthKeeping("/api/today", nothingToday)).toBe(false);
    expect(
      worker.worthKeeping("/api/today", {
        ...nothingToday,
        air: { status: "stale" },
      }),
    ).toBe(true);
    expect(
      worker.worthKeeping("/api/hazards", {
        earthquakes: { status: "unavailable" },
        typhoon: { status: "fresh" },
      }),
    ).toBe(true);
    expect(
      worker.worthKeeping("/api/hazards", {
        earthquakes: { status: "not-configured" },
        typhoon: { status: "unavailable" },
      }),
    ).toBe(false);
    expect(worker.worthKeeping("/api/reservoirs", { status: "fresh" })).toBe(
      true,
    );
    expect(
      worker.worthKeeping("/api/observations/aqi", { status: "unavailable" }),
    ).toBe(false);
    expect(worker.worthKeeping("/api/today", null)).toBe(false);
    expect(worker.worthKeeping("/api/today", [])).toBe(false);
    expect(worker.worthKeeping("/api/reservoirs", {})).toBe(false);
  });
});

describe("live feeds", () => {
  it("passes a live answer through untouched and saves a copy with its time", async () => {
    const w = makeWorker();
    w.setNetwork(async () => json(goodToday));
    const answer = (await w.fetchEvent(req("/api/today"))) as Response;
    expect(answer.headers.get("x-ecoatlas-from-cache")).toBeNull();
    expect(await answer.json()).toEqual(goodToday);
    const saved = await w.cache("ecoatlas-data-v1")!.match(req("/api/today"));
    expect(saved).toBeDefined();
    expect(
      Date.parse(saved!.headers.get("x-ecoatlas-saved-at")!),
    ).not.toBeNaN();
    expect(saved!.headers.get("x-ecoatlas-from-cache")).toBeNull();
  });

  it("returns the saved copy, marked, when the network is down", async () => {
    const w = makeWorker();
    w.setNetwork(async () => json(goodToday));
    await w.fetchEvent(req("/api/today"));
    const savedAt = (await w
      .cache("ecoatlas-data-v1")!
      .match(req("/api/today")))!.headers.get("x-ecoatlas-saved-at");
    w.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const answer = (await w.fetchEvent(req("/api/today"))) as Response;
    expect(answer.headers.get("x-ecoatlas-from-cache")).toBe("1");
    expect(answer.headers.get("x-ecoatlas-saved-at")).toBe(savedAt);
    expect(await answer.json()).toEqual(goodToday);
  });

  it("falls back to the saved copy when the server errors", async () => {
    const w = makeWorker();
    w.setNetwork(async () => json(goodToday));
    await w.fetchEvent(req("/api/today"));
    w.setNetwork(async () => new Response("bad gateway", { status: 502 }));
    const answer = (await w.fetchEvent(req("/api/today"))) as Response;
    expect(answer.status).toBe(200);
    expect(answer.headers.get("x-ecoatlas-from-cache")).toBe("1");
  });

  it("shows a server error as it is when nothing is saved", async () => {
    const w = makeWorker();
    w.setNetwork(async () => new Response("bad gateway", { status: 502 }));
    const answer = (await w.fetchEvent(req("/api/today"))) as Response;
    expect(answer.status).toBe(502);
    expect(answer.headers.get("x-ecoatlas-from-cache")).toBeNull();
  });

  it("fails as it would without a worker when offline with nothing saved", async () => {
    const w = makeWorker();
    const answer = await w.fetchEvent(req("/api/today"));
    expect(answer).toBeInstanceOf(TypeError);
  });

  it("never lets an all-unavailable answer replace a good saved copy", async () => {
    const w = makeWorker();
    w.setNetwork(async () => json(goodToday));
    await w.fetchEvent(req("/api/today"));
    w.setNetwork(async () => json(nothingToday));
    const live = (await w.fetchEvent(req("/api/today"))) as Response;
    // The live answer is shown as it is, honestly unavailable...
    expect(await live.json()).toEqual(nothingToday);
    // ...but the good copy is still the one kept for the next time offline.
    w.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const later = (await w.fetchEvent(req("/api/today"))) as Response;
    expect(await later.json()).toEqual(goodToday);
  });

  it("does not save a response that is not valid JSON", async () => {
    const w = makeWorker();
    w.setNetwork(async () => new Response("<html>Request Rejected</html>"));
    await w.fetchEvent(req("/api/reservoirs"));
    expect((await w.cache("ecoatlas-data-v1")!.keys()).length).toBe(0);
  });

  describe("a slow network", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("gives the saved copy after the wait, and keeps refreshing it behind", async () => {
      const w = makeWorker();
      w.setNetwork(async () => json(goodToday));
      await w.fetchEvent(req("/api/today"));
      const firstSavedAt = (await w
        .cache("ecoatlas-data-v1")!
        .match(req("/api/today")))!.headers.get("x-ecoatlas-saved-at");
      const slowBody = { ...goodToday, checkedAt: "slow" };
      w.setNetwork(
        () =>
          new Promise<Response>((resolve) =>
            setTimeout(() => resolve(json(slowBody)), 30_000),
          ),
      );
      const pending = w.fetchEvent(req("/api/today"));
      await vi.advanceTimersByTimeAsync(w.worker.WAIT_MS + 10);
      // The answer is the saved copy, marked...
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(30_000);
      const answer = (await pending) as Response;
      expect(answer.headers.get("x-ecoatlas-from-cache")).toBe("1");
      expect(await answer.json()).toEqual(goodToday);
      // ...and the late answer was saved for next time.
      const refreshed = await w
        .cache("ecoatlas-data-v1")!
        .match(req("/api/today"));
      expect(await refreshed!.json()).toEqual(slowBody);
      expect(firstSavedAt).toBeTruthy();
    });

    it("keeps waiting for the network when there is no saved copy", async () => {
      const w = makeWorker();
      w.setNetwork(
        () =>
          new Promise<Response>((resolve) =>
            setTimeout(() => resolve(json(goodToday)), 20_000),
          ),
      );
      const pending = w.fetchEvent(req("/api/today"));
      await vi.advanceTimersByTimeAsync(20_100);
      const answer = (await pending) as Response;
      expect(answer.headers.get("x-ecoatlas-from-cache")).toBeNull();
      expect(await answer.json()).toEqual(goodToday);
    });
  });
});

describe("pages", () => {
  it("serves the live page and keeps it for later", async () => {
    const w = makeWorker();
    w.setNetwork(async () => html("<h1>county</h1>"));
    const answer = (await w.fetchEvent(nav("/county/63000"))) as Response;
    expect(await answer.text()).toBe("<h1>county</h1>");
    expect(
      await w.cache("ecoatlas-pages-v1")!.match(nav("/county/63000")),
    ).toBeDefined();
  });

  it("serves the last copy of a page it has opened when offline", async () => {
    const w = makeWorker();
    w.setNetwork(async () => html("<h1>county</h1>"));
    await w.fetchEvent(nav("/county/63000"));
    w.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const answer = (await w.fetchEvent(nav("/county/63000"))) as Response;
    expect(await answer.text()).toBe("<h1>county</h1>");
  });

  it("sends a page never opened to the offline page, remembering which one", async () => {
    const w = makeWorker();
    w.setNetwork(async () => html("<h1>offline</h1>"));
    await w.lifecycle("install");
    w.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const answer = (await w.fetchEvent(nav("/never/opened?x=1"))) as Response;
    expect(answer.status).toBe(302);
    expect(answer.headers.get("location")).toBe(
      `${origin}/offline?from=${encodeURIComponent("/never/opened?x=1")}`,
    );
    expect(w.scope.skipWaiting).toHaveBeenCalled();
  });

  it("serves the saved offline page itself, whatever is after the question mark", async () => {
    const w = makeWorker();
    w.setNetwork(async () => html("<h1>offline</h1>"));
    await w.lifecycle("install");
    w.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const answer = (await w.fetchEvent(
      nav("/offline?from=%2Fnever%2Fopened"),
    )) as Response;
    expect(answer.status).toBe(200);
    expect(await answer.text()).toBe("<h1>offline</h1>");
  });

  it("does not keep a copy of the offline page for each page it stood in for", async () => {
    const w = makeWorker();
    w.setNetwork(async () => html("<h1>offline</h1>"));
    await w.lifecycle("install");
    await w.fetchEvent(nav("/offline?from=%2Fa"));
    await w.fetchEvent(nav("/offline?from=%2Fb"));
    const keys = (await w.cache("ecoatlas-pages-v1")!.keys()).map((k) => k.url);
    expect(keys).toEqual([`${origin}/offline`]);
  });

  it("saves, at install, the scripts and styles the offline page needs to start", async () => {
    const w = makeWorker();
    w.setNetwork(async (r) =>
      r.url.endsWith("/offline")
        ? html(
            '<link rel="stylesheet" href="/_next/static/css/b.css"/>' +
              '<script src="/_next/static/chunks/app/offline/page-1.js" async></script>' +
              '<script>self.__next_f.push([1,"\\"/_next/static/chunks/main-2.js\\""])</script>' +
              '<script src="/_next/static/chunks/missing.js"></script>',
          )
        : r.url.endsWith("missing.js")
          ? new Response("nope", { status: 404 })
          : new Response("asset"),
    );
    await w.lifecycle("install");
    const kept = (await w.cache("ecoatlas-static-v1")!.keys()).map(
      (k) => new URL(k.url).pathname,
    );
    expect(kept.sort()).toEqual([
      "/_next/static/chunks/app/offline/page-1.js",
      "/_next/static/chunks/main-2.js",
      "/_next/static/css/b.css",
    ]);
    expect(await w.cache("ecoatlas-pages-v1")!.match("/offline")).toBeDefined();
  });

  it("installs even if the offline page cannot be fetched", async () => {
    const w = makeWorker();
    await expect(w.lifecycle("install")).resolves.toBeUndefined();
    expect(w.scope.skipWaiting).toHaveBeenCalled();
  });

  it("lets the browser's own error show when nothing at all is saved", async () => {
    const w = makeWorker();
    const answer = await w.fetchEvent(nav("/never/opened"));
    expect(answer).toBeInstanceOf(TypeError);
  });

  it("keeps only HTML pages, and only successful ones", async () => {
    const w = makeWorker();
    w.setNetwork(
      async () =>
        new Response("x", { headers: { "content-type": "text/plain" } }),
    );
    await w.fetchEvent(nav("/plain"));
    w.setNetwork(
      async () =>
        new Response(html("<h1>gone</h1>").body, {
          status: 404,
          headers: { "content-type": "text/html" },
        }),
    );
    await w.fetchEvent(nav("/missing"));
    expect((await w.cache("ecoatlas-pages-v1")!.keys()).length).toBe(0);
  });

  it("keeps at most 40 pages, dropping the oldest", async () => {
    const w = makeWorker();
    w.setNetwork(async () => html("<p>page</p>"));
    for (let i = 0; i < 45; i++) await w.fetchEvent(nav(`/p/${i}`));
    const keys = (await w.cache("ecoatlas-pages-v1")!.keys()).map((k) => k.url);
    expect(keys).toHaveLength(40);
    expect(keys).not.toContain(`${origin}/p/0`);
    expect(keys).toContain(`${origin}/p/44`);
  });
});

describe("build files and boundaries", () => {
  it("serves a hashed build file from the device after the first time", async () => {
    const w = makeWorker();
    w.setNetwork(async () => new Response("code"));
    await w.fetchEvent(req("/_next/static/chunks/a-1f3.js"));
    const before = w.calls.length;
    const again = (await w.fetchEvent(
      req("/_next/static/chunks/a-1f3.js"),
    )) as Response;
    expect(await again.text()).toBe("code");
    expect(w.calls.length).toBe(before);
  });

  it("serves boundaries from the device at once and refreshes them behind", async () => {
    const w = makeWorker();
    w.setNetwork(async () => new Response("v1"));
    await w.fetchEvent(req("/data/counties.geojson"));
    w.setNetwork(async () => new Response("v2"));
    const answer = (await w.fetchEvent(
      req("/data/counties.geojson"),
    )) as Response;
    expect(await answer.text()).toBe("v1");
    const next = (await w.fetchEvent(
      req("/data/counties.geojson"),
    )) as Response;
    expect(await next.text()).toBe("v2");
  });

  it("serves boundaries from the device when offline", async () => {
    const w = makeWorker();
    w.setNetwork(async () => new Response("v1"));
    await w.fetchEvent(req("/data/counties.geojson"));
    w.setNetwork(async () => {
      throw new TypeError("offline");
    });
    const answer = (await w.fetchEvent(
      req("/data/counties.geojson"),
    )) as Response;
    expect(await answer.text()).toBe("v1");
  });
});

describe("everything else", () => {
  it("does not answer requests it does not own", async () => {
    const w = makeWorker();
    w.setNetwork(async () => new Response("x"));
    expect(await w.fetchEvent(req("/api/atlas/wildlife"))).toBeUndefined();
    expect(
      await w.fetchEvent(req("/api/today", { method: "POST" })),
    ).toBeUndefined();
    expect(
      await w.fetchEvent(req("https://tiles.example/1/2/3.png")),
    ).toBeUndefined();
    expect(w.calls).toEqual([]);
  });

  it("drops the caches of an older version and nobody else's", async () => {
    const w = makeWorker();
    const empty = () => new FakeCache(async () => new Response(""));
    w.stores.set("ecoatlas-pages-v0", empty());
    w.stores.set("someone-else", empty());
    w.stores.set("ecoatlas-data-v1", empty());
    await w.lifecycle("activate");
    expect([...w.stores.keys()].sort()).toEqual([
      "ecoatlas-data-v1",
      "someone-else",
    ]);
    expect((w.scope.clients as { claim: () => void }).claim).toHaveBeenCalled();
  });
});
