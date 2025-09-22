import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only - reduce retries for faster feedback */
  retries: process.env.CI ? 1 : 0,
  /* Use more workers on CI for better performance */
  workers: process.env.CI ? 4 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        ["github"],
        ["html"],
        ["junit", { outputFile: "test-results/junit.xml" }],
      ]
    : [["html"], ["junit", { outputFile: "test-results/junit.xml" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3001",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? "off" : "on-first-retry",

    /* Take screenshots on failure - reduce to save time */
    screenshot: process.env.CI ? "off" : "only-on-failure",

    /* Record video on failure - disable in CI for speed */
    video: process.env.CI ? "off" : "retain-on-failure",

    /* Use domcontentloaded instead of networkidle for faster tests */
    waitUntil: "domcontentloaded",

    /* Increased timeouts for static site to reduce flakiness in CI */
    timeout: process.env.CI ? 5000 : 5000,
    navigationTimeout: process.env.CI ? 3000 : 3000,
    actionTimeout: process.env.CI ? 2000 : 2000,

    headless: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run serve:test",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 15 * 1000 : 30 * 1000, // Faster startup in CI
    stdout: "ignore",
    stderr: "pipe",
  },
});
