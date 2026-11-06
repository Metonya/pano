import { expect, test } from "@playwright/test";

const system = {
  version: "0.1.0",
  buildDate: "2026-01-01T00:00:00Z",
  dataDir: "/data",
  dbSize: 123,
  latestVersion: "v99.0.0",
  updateAvailable: true,
};

test("/settings adresi popup açar; dil, tema, sürüm ve güncelleme bildirimi çalışır", async ({
  page,
}) => {
  await page.addInitScript(
    () =>
      localStorage.getItem("pano-language") ||
      localStorage.setItem("pano-language", "tr"),
  );
  await page.route("**/api/v1/system", (route) =>
    route.fulfill({ json: system }),
  );
  await page.goto("/settings");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The home page stays underneath the window.
  await expect(page.locator(".toolbar h1")).toHaveText("Projeler");
  await expect(
    dialog.getByText("v99.0.0", { exact: false }).first(),
  ).toBeVisible();
  await dialog.locator("#app-language").selectOption("en");
  // Changing the language keeps the window open and translates what is behind it.
  await expect(dialog.getByRole("tab", { name: "Appearance" })).toBeVisible();
  await expect(page.locator(".toolbar h1")).toHaveText("Projects");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Appearance" })).toBeVisible();
  await page.getByRole("tab", { name: "Appearance" }).click();
  await expect(dialog.getByRole("heading", { name: "Appearance" })).toHaveCount(
    1,
  );
  await page.getByRole("radio", { name: "Dark" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Automatic" }).check();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await page.getByRole("tab", { name: "About" }).click();
  await expect(page.getByText("v0.1.0", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/");
});

test("Ayarlar bulunduğun sayfada popup açar; X, Esc ve dışarı tıklama kapatır", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "POPUP", name: "Popup denemesi" },
  });
  await page.goto("/projects/POPUP");
  const dialog = page.getByRole("dialog");
  const open = () =>
    page.getByRole("button", { name: "Ayarlar", exact: true }).click();
  await open();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL("/projects/POPUP");
  await expect(page.locator(".toolbar h1")).toHaveText("Popup denemesi");
  await expect(dialog.getByRole("heading")).toHaveText("Genel");
  // Opening a settings window puts focus on the window, not on a control.
  await expect(dialog).toBeFocused();

  // The window keeps its size between tabs. It opens with a zoom animation,
  // so measure only after that has finished.
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished)),
  );
  const box = await dialog.boundingBox();
  for (const name of ["Görünüm", "Agent bağlantısı", "Hakkında", "Genel"]) {
    await dialog.getByRole("tab", { name }).click();
    await expect(dialog.getByRole("heading")).toHaveText(name);
    const next = await dialog.boundingBox();
    expect(next?.height).toBe(box?.height);
    expect(next?.width).toBe(box?.width);
  }
  expect(box?.width).toBe(720);

  await dialog.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/projects/POPUP");
  await open();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await open();
  await page.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/projects/POPUP");
});

test("ayarlar mobilde yatay taşmadan kullanılır", async ({ page }) => {
  await page.route("**/api/v1/system", (route) =>
    route.fulfill({ json: system }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("button", { name: "Ayarlar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("aside")).not.toHaveClass(/mobile-open/);
  for (const name of ["Genel", "Görünüm", "Agent bağlantısı", "Hakkında"]) {
    await dialog.getByRole("tab", { name }).click();
    await expect(dialog.getByRole("heading")).toHaveText(name);
    expect(
      await dialog.evaluate((el) =>
        [el, ...el.querySelectorAll(".settings-tabs, .settings-body")].every(
          (part) => part.scrollWidth <= part.clientWidth,
        ),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("proje ayarları pencerede odaklı açılır; form pencereleri ilk alana odaklanır", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "ODAK", name: "Odak denemesi" },
  });
  await page.goto("/projects/ODAK");
  await page.getByRole("button", { name: "Proje ayarları" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
    "DIV",
  );
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("");
  await expect(dialog).toHaveCSS("outline-style", "none");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Yeni PBI" }).click();
  await expect(page.getByLabel("Başlık")).toBeFocused();
});
