import { describe, expect, it } from "vitest";
import { isChunkError } from "@/lib/chunk-error";

describe("isChunkError", () => {
  it("recognises the errors a browser raises for a file it could not fetch", () => {
    const named = new Error("Loading chunk 2141 failed.");
    named.name = "ChunkLoadError";
    expect(isChunkError(named)).toBe(true);
    expect(isChunkError(new Error("Loading chunk 2141 failed."))).toBe(true);
    expect(isChunkError(new Error("Loading CSS chunk 88 failed."))).toBe(true);
    expect(isChunkError({ name: "ChunkLoadError" })).toBe(true);
  });

  it("does not hide anything else", () => {
    expect(isChunkError(new Error("Cannot read properties of undefined"))).toBe(
      false,
    );
    expect(isChunkError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isChunkError(null)).toBe(false);
    expect(isChunkError(undefined)).toBe(false);
    expect(isChunkError("Loading chunk 1 failed")).toBe(false);
    expect(isChunkError({})).toBe(false);
  });
});
