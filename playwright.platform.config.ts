import { defineConfig } from "@playwright/test";
import production from "./playwright.production.config";

// Real public endpoints and datasets; no local server or provider mocks.
export default defineConfig({
  ...production,
  testDir: "tests/browser",
  testMatch: ["platform.spec.ts", "atlas-explorer.spec.ts"],
  outputDir: "test-results/platform-production",
});
