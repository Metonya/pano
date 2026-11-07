import { expect, test } from "@playwright/test";

const system = {
  version: "0.1.0",
  buildDate: "2026-01-01T00:00:00Z",
  dataDir: "/data",
  dbSize: 123,
  latestVersion: "v99.0.0",
  updateAvailable: true,
};

test("/settings opens a popup with language, theme, version and update notification", async ({
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
  // The home page stays underneath the window in the selected Turkish language.
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

test("settings opens over the current page and closes with X, Escape or outside click", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "POPUP", name: "Popup test" },
  });
  await page.goto("/projects/POPUP");
  const dialog = page.getByRole("dialog");
  const open = () =>
    page.getByRole("button", { name: "Settings", exact: true }).click();
  await open();
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL("/projects/POPUP");
  await expect(page.locator(".toolbar h1")).toHaveText("Popup test");
  await expect(dialog.getByRole("heading")).toHaveText("General");
  // Opening a settings window puts focus on the window, not on a control.
  await expect(dialog).toBeFocused();

  // The window keeps its size between tabs. It opens with a zoom animation,
  // so measure only after that has finished.
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished)),
  );
  const box = await dialog.boundingBox();
  for (const name of ["Appearance", "Agent connection", "About", "General"]) {
    await dialog.getByRole("tab", { name }).click();
    await expect(dialog.getByRole("heading")).toHaveText(name);
    const next = await dialog.boundingBox();
    expect(next?.height).toBe(box?.height);
    expect(next?.width).toBe(box?.width);
  }
  expect(box?.width).toBe(720);

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
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

test("settings fits mobile without horizontal overflow", async ({ page }) => {
  await page.route("**/api/v1/system", (route) =>
    route.fulfill({ json: system }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("aside")).not.toHaveClass(/mobile-open/);
  for (const name of ["General", "Appearance", "Agent connection", "About"]) {
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

test("project settings focuses the dialog; forms focus the first field", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "FOCUS", name: "Focus test" },
  });
  await page.goto("/projects/FOCUS");
  await page.getByRole("button", { name: "Project settings" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
    "DIV",
  );
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("");
  await expect(dialog).toHaveCSS("outline-style", "none");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "New PBI" }).click();
  await expect(page.getByRole("textbox", { name: "Title" })).toBeFocused();
});

test.describe("14 languages", () => {
  test.use({ timezoneId: "UTC" });

  test("German and Japanese selection, date formatting and persistence after reload", async ({
    page,
  }) => {
    await page.route("**/api/v1/system", (route) =>
      route.fulfill({ json: system }),
    );
    // The server's stored language must not replace this browser's choice.
    await page.route("**/api/v1/settings", (route) =>
      route.fulfill({ json: { language: "tr" } }),
    );
    await page.goto("/settings");
    const dialog = page.getByRole("dialog");
    const select = dialog.locator("#app-language");
    await expect(select.locator("option")).toHaveText([
      "English",
      "Türkçe",
      "Azərbaycan",
      "中文",
      "हिन्दी",
      "Español",
      "Deutsch",
      "Français",
      "Português",
      "日本語",
      "Nederlands",
      "한국어",
      "Svenska",
      "Polski",
    ]);
    await select.selectOption("de");
    await expect(
      dialog.getByRole("tab", { name: "Darstellung" }),
    ).toBeVisible();
    await expect(page.locator(".toolbar h1")).toHaveText("Projekte");
    await expect(dialog).toContainText("01.01.2026");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.reload();
    await expect(select).toHaveValue("de");
    await expect(
      dialog.getByRole("tab", { name: "Darstellung" }),
    ).toBeVisible();
    await expect(dialog).toContainText("01.01.2026");
    await select.selectOption("ja");
    await expect(dialog.getByRole("tab", { name: "外観" })).toBeVisible();
    await expect(page.locator(".toolbar h1")).toHaveText("プロジェクト");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await page.reload();
    await expect(select).toHaveValue("ja");
    await expect(dialog.getByRole("tab", { name: "外観" })).toBeVisible();
  });

  for (const width of [375, 1280]) {
    test(`German settings and board fit without horizontal overflow: ${width}`, async ({
      page,
      request,
    }) => {
      const key = `LANG${width}`;
      await request.post("/api/v1/projects", {
        data: { key, name: "Projekt mit einem langen Namen" },
      });
      await request.post(`/api/v1/projects/${key}/items`, {
        data: {
          title:
            "Eine ausführliche Beschreibung zur Überprüfung der Benutzeroberfläche",
          priority: "high",
        },
      });
      await page.addInitScript(() =>
        localStorage.setItem("pano-language", "de"),
      );
      await page.setViewportSize({ width, height: 812 });
      await page.route("**/api/v1/system", (route) =>
        route.fulfill({ json: system }),
      );
      await page.goto(`/projects/${key}`);
      await expect(
        page.getByText(
          "Eine ausführliche Beschreibung zur Überprüfung der Benutzeroberfläche",
          { exact: true },
        ),
      ).toBeVisible();
      expect(
        await page
          .locator(".board")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width < 701)
        await page.getByRole("button", { name: "Menü öffnen" }).click();
      await page
        .getByRole("button", { name: "Einstellungen", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      for (const name of [
        "Allgemein",
        "Darstellung",
        "Agent Verbindung",
        "Über",
      ]) {
        await dialog.getByRole("tab", { name, exact: true }).click();
        await expect(dialog.getByRole("heading")).toHaveText(name);
        expect(
          await dialog.evaluate((el) =>
            [
              el,
              ...el.querySelectorAll(".settings-tabs, .settings-body"),
            ].every((part) => part.scrollWidth <= part.clientWidth),
          ),
        ).toBe(true);
        const tabs = await dialog.getByRole("tab").evaluateAll((nodes) =>
          nodes.map((node) => ({
            width: node.clientWidth,
            content: node.scrollWidth,
          })),
        );
        expect(tabs.every((tab) => tab.content <= tab.width)).toBe(true);
      }
    });
  }
});

test.describe("Japanese on first launch", () => {
  test.use({ locale: "ja-JP" });
  test("uses the system language instead of the server preference", async ({
    page,
  }) => {
    await page.route("**/api/v1/settings", (route) =>
      route.fulfill({ json: { language: "tr" } }),
    );
    await page.goto("/settings");
    await expect(page.locator(".toolbar h1")).toHaveText("プロジェクト");
    await expect(page.locator("#app-language")).toHaveValue("ja");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  });
});

test.describe("unsupported system language", () => {
  test.use({ locale: "ru-RU" });
  test("uses English on first launch", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator(".toolbar h1")).toHaveText("Projects");
    await expect(page.locator("#app-language")).toHaveValue("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
