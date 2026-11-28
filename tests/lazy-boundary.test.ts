import { describe, expect, it } from "vitest";
import { LazyBoundary } from "@/components/pwa/lazy-boundary";

// The boundary's two rules, without a browser: a file that could not be
// fetched is replaced by the fallback; any other error is not swallowed.
const make = (error: unknown) => {
  const boundary = new LazyBoundary({
    children: "the map",
    fallback: "a note",
  });
  boundary.state = LazyBoundary.getDerivedStateFromError(error);
  return boundary;
};

describe("LazyBoundary", () => {
  it("shows the children while nothing has failed", () => {
    const boundary = new LazyBoundary({
      children: "the map",
      fallback: "a note",
    });
    expect(boundary.render()).toBe("the map");
  });

  it("shows the fallback when a file could not be fetched", () => {
    const failure = new Error("Loading chunk 2141 failed.");
    failure.name = "ChunkLoadError";
    expect(make(failure).render()).toBe("a note");
  });

  it("passes any other error up to the page's error screen", () => {
    const bug = new TypeError("Cannot read properties of undefined");
    expect(() => make(bug).render()).toThrow(bug);
  });

  it("does not treat a thrown nothing as a missing file", () => {
    expect(() => make(undefined).render()).toThrow();
  });
});
