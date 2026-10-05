import { defineConfig, devices } from "@playwright/test";

/*
 * Smoke and accessibility tests against a running app and API (see README → Testing).
 * Start the API (php artisan serve, DemoSeeder data) and Vite first, or point
 * E2E_BASE_URL at a deployed site. PW_CHROMIUM uses an existing Chromium binary.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
