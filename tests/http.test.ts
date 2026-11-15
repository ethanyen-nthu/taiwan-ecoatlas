import { afterEach, expect, it, vi } from "vitest";
import { fetchJson, UpstreamRequestError } from "@/server/http";
afterEach(() => {
  vi.unstubAllGlobals();
});
it("retries transient upstream errors", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("", { status: 503 }))
    .mockResolvedValueOnce(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  expect(await fetchJson("https://example.test/data")).toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("does not retry invalid credentials or leak request URLs", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  await expect(
    fetchJson("https://example.test/?api_key=TEST_SECRET"),
  ).rejects.toThrow("External data request failed");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("retains only safe failure metadata, without URLs or response bodies", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response("private response", { status: 401 })),
  );
  const failure = await fetchJson(
    "https://example.test/?api_key=TEST_SECRET",
  ).catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(UpstreamRequestError);
  expect(failure).toMatchObject({ category: "http-status", status: 401 });
  expect(JSON.stringify(failure)).not.toMatch(
    /TEST_SECRET|example\.test|private response/,
  );
});
it("redacts unexpected network errors and retains only known transport codes", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockRejectedValue(
        new Error("TEST_SECRET in request URL", {
          cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" },
        }),
      ),
  );
  const failure = await fetchJson(
    "https://example.test/?api_key=TEST_SECRET",
    {},
    1,
  ).catch((error: unknown) => error);
  expect(failure).toMatchObject({
    category: "network",
    status: null,
    networkCode: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  });
  expect(JSON.stringify(failure)).not.toContain("TEST_SECRET");
});
