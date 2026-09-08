import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3002",
    viewport: { width: 390, height: 844 },
    trace: "off",
  },
  reporter: "list",
});
