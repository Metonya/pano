import { expect, test } from "@playwright/test";

test("language, theme, version and update notice", async ({ page }) => {
  await page.addInitScript(
    () =>
      localStorage.getItem("pano-language") ||
      localStorage.setItem("pano-language", "tr"),
  );
  await page.route("**/api/v1/system", (route) =>
    route.fulfill({
      json: {
        version: "0.1.0",
        buildDate: "2026-01-01T00:00:00Z",
        dataDir: "/data",
        dbSize: 123,
        latestVersion: "v99.0.0",
        updateAvailable: true,
      },
    }),
  );
  await page.goto("/settings");
  await expect(
    page.getByText("v99.0.0", { exact: false }).first(),
  ).toBeVisible();
  await page.locator("#app-language").selectOption("en");
  await expect(page.getByRole("tab", { name: "Appearance" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Appearance" })).toBeVisible();
  await page.getByRole("tab", { name: "Appearance" }).click();
  await page.getByRole("radio", { name: "Dark" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Automatic" }).check();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await page.getByRole("tab", { name: "About" }).click();
  await expect(page.getByText("v0.1.0", { exact: true })).toBeVisible();
});
