import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "**/performance.spec.ts",
  workers: 1,
  timeout: 120000,
  projects: [
    {
      name: "performance-chromium",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
  ],
});
