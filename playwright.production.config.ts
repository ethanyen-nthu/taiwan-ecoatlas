import { defineConfig, devices } from "@playwright/test";

if (!process.env.ECOATLAS_BASE_URL)
  throw new Error("Set ECOATLAS_BASE_URL to the deployment being verified");
export default defineConfig({
  testDir: "tests/production",
  timeout: 90000,
  expect: { timeout: 30000 },
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.ECOATLAS_BASE_URL,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
    },
  },
});
