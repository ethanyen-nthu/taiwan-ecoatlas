import { afterEach, expect, it, vi } from "vitest";
import { fetchJson } from "@/server/http";
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
