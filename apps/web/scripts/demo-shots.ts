import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import en from "../src/i18n/en.json" with { type: "json" };

const baseURL = process.env.PANO_URL?.replace(/\/+$/, "");
const token = process.env.PANO_TOKEN;
if (!baseURL || !token)
  throw new Error("Set PANO_URL and PANO_TOKEN for the demo installation.");
const output = resolve(import.meta.dirname, "../../../docs/images");
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    baseURL,
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  await context.addInitScript(
    ({ token }) => {
      localStorage.setItem("pano:token", token);
      localStorage.setItem("pano-language", "en");
      localStorage.setItem("pano-theme", "light");
    },
    { token },
  );
  // A screenshot run must never write to the server, including automatic seen markers.
  await context.route("**/api/**", async (route) => {
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method()))
      await route.continue();
    else await route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await mkdir(output, { recursive: true });

  async function shot(name: string) {
    await page.mouse.move(1430, 890);
    await page.evaluate(() => document.fonts.ready);
    // SSE stays open, so networkidle is unsuitable. Wait for UI and animations instead.
    await page.waitForTimeout(600);
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getComputedTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    // The focus ring of an opened dialog is noise in a product picture.
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.screenshot({
      path: resolve(output, `${name}.png`),
      animations: "disabled",
    });
  }
  async function board(item?: number) {
    await page.goto(`/projects/DRIFT${item ? `?item=${item}` : ""}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator(".board-card")).toHaveCount(14);
    await expect(page.locator(".board-summary")).toBeVisible();
    if (item) {
      await expect(page.locator(".sheet-properties")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: en.criteria, exact: true }),
      ).toBeVisible();
    }
  }

  await board();
  await shot("board");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await shot("board-dark");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });

  await board(7);
  await shot("detail");
  await board(5);
  await expect(page.locator(".test-scenario")).toHaveCount(3);
  await expect(page.locator(".test-checks li")).toHaveCount(2);
  await shot("test");
  await page.getByRole("tab", { name: en.history, exact: true }).click();
  await expect(page.locator(".history-timeline li").first()).toBeVisible();
  await shot("history");

  await page.goto("/");
  await expect(page.locator(".project-card")).toHaveCount(2);
  await shot("projects");
  await page.goto("/waiting");
  await expect(page.locator(".waiting-row-title")).toHaveCount(2);
  await shot("waiting");

  await board();
  await page.locator(".board-summary").click();
  await expect(
    page.getByRole("heading", { name: en.summaryDetails, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".summary-popover dl")).toHaveCount(2);
  await shot("summary");
} finally {
  await browser.close();
}
