import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/observations/[kind]/route";
import { POST } from "@/app/api/ingest/route";
import { observationService } from "@/server/observations";
vi.mock("@/server/observations", () => ({
  observationService: {
    get: vi
      .fn()
      .mockResolvedValue({
        source: "aqi",
        status: "fresh",
        observations: [{ longitude: 121.5, latitude: 25.0 }],
        retrievedAt: "2026-11-15T00:00:00Z",
      }),
  },
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("public query validation", () => {
  it.each([
    "1,2,3",
    "25,121,24,120",
    "-181,20,122,27",
    "117,20,122,91",
    "a,20,122,27",
    ",20,122,27",
  ])("rejects invalid viewport %s", async (bbox) => {
    const response = await GET(
      new NextRequest(
        `https://ecoatlas.test/api/observations/aqi?bbox=${bbox}`,
      ),
      { params: Promise.resolve({ kind: "aqi" }) },
    );
    expect(response.status).toBe(400);
    expect(observationService.get).not.toHaveBeenCalled();
  });
  it("filters valid viewport without inventing replacement points", async () => {
    const response = await GET(
      new NextRequest(
        "https://ecoatlas.test/api/observations/aqi?bbox=118,22,119,23",
      ),
      { params: Promise.resolve({ kind: "aqi" }) },
    );
    expect((await response.json()).observations).toEqual([]);
  });
  it("rejects unknown provider identifiers", async () => {
    expect(
      (
        await GET(
          new NextRequest("https://ecoatlas.test/api/observations/unknown"),
          { params: Promise.resolve({ kind: "unknown" }) },
        )
      ).status,
    ).toBe(404);
  });
});
describe("trusted ingestion authorization", () => {
  it("is disabled without a cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(
      (
        await POST(
          new NextRequest("https://ecoatlas.test/api/ingest", {
            method: "POST",
          }),
        )
      ).status,
    ).toBe(503);
  });
  it("rejects missing and incorrect bearer tokens without invoking providers", async () => {
    vi.stubEnv("CRON_SECRET", "TEST_SECRET");
    for (const authorization of ["", "Bearer bad", "Bearer TEST_SECREU"])
      expect(
        (
          await POST(
            new NextRequest("https://ecoatlas.test/api/ingest", {
              method: "POST",
              headers: { authorization },
            }),
          )
        ).status,
      ).toBe(401);
    expect(observationService.get).not.toHaveBeenCalled();
  });
  it("uses validated adapters after authorization", async () => {
    vi.stubEnv("CRON_SECRET", "TEST_SECRET");
    expect(
      (
        await POST(
          new NextRequest("https://ecoatlas.test/api/ingest", {
            method: "POST",
            headers: { authorization: "Bearer TEST_SECRET" },
          }),
        )
      ).status,
    ).toBe(200);
    expect(observationService.get).toHaveBeenCalledWith("aqi");
    expect(observationService.get).toHaveBeenCalledWith("weather");
  });
});
