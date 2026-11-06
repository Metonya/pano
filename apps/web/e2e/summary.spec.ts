import { expect, test } from "@playwright/test";

test("özet sayıları, SSE ile Done ve popover klavye davranışı", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post("/api/v1/projects", {
        data: { key: "SUMMARY", name: "Özet" },
      })
    ).ok(),
  ).toBe(true);
  for (const priority of ["high", "medium", "low", "medium"]) {
    expect(
      (
        await request.post("/api/v1/projects/SUMMARY/items", {
          data: { title: `İş ${priority}`, priority },
        })
      ).ok(),
    ).toBe(true);
  }
  expect(
    (
      await request.post("/api/v1/items/SUMMARY-4/move", {
        data: { status: "cancelled", reason: "Tekrar" },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/projects/SUMMARY");
  const summary = page.locator("button.board-summary");
  await expect(summary).toContainText("0 / 3 tamamlandı");
  await expect(summary).toContainText("3 kaldı");
  await expect(summary).toContainText("1 yüksek öncelikli");
  await expect(summary).toHaveAttribute("aria-haspopup", "dialog");
  await expect(summary).toHaveAccessibleName(/Toplam 3, 0 tamamlandı/);
  await summary.focus();
  await page.keyboard.press("Enter");
  const popover = page.getByRole("dialog", { name: "Proje özeti" });
  await expect(popover).toBeVisible();
  await expect(
    popover
      .locator("dl > div")
      .filter({ hasText: "İptal edilen" })
      .locator("dd"),
  ).toHaveText("1");
  await expect(popover.getByRole("img")).toHaveCount(0);
  await expect(popover).toContainText("Bugün açıldı, henüz tamamlanan iş yok");
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(summary).toBeFocused();
  expect(
    (
      await request.post("/api/v1/items/SUMMARY-1/move", {
        data: { status: "done" },
      })
    ).ok(),
  ).toBe(true);
  await expect(summary).toContainText("1 / 3 tamamlandı");
  await expect(summary).toHaveAccessibleName(/Toplam 3, 1 tamamlandı/);
  await expect(summary).toContainText("2 kaldı");
  await expect(summary).toContainText("0 yüksek öncelikli");
  await summary.click();
  await expect(
    popover
      .locator("dl > div")
      .filter({ hasText: "Son 7 günde tamamlanan" })
      .locator("dd"),
  ).toHaveText("1");
  await expect(popover).toContainText("Bugün açıldı, 1 iş tamamlandı");
});

for (const variant of ["light", "dark"] as const) {
  test(`grafik etiketleri, fare, klavye ve ekran sınırları: ${variant}`, async ({
    page,
    request,
  }) => {
    const key = variant === "light" ? "CHARTLIGHT" : "CHARTDARK";
    expect(
      (
        await request.post("/api/v1/projects", {
          data: { key, name: "Grafik" },
        })
      ).ok(),
    ).toBe(true);
    await page.route(`**/api/v1/projects/${key}/summary`, (route) =>
      route.fulfill({
        json: {
          started_at: "2026-11-04T00:00:00.000Z",
          total: 28,
          completed: 25,
          remaining: 3,
          cancelled: 1,
          remaining_by_priority: { high: 1, medium: 1, low: 1 },
          completed_last_7_days: 25,
          burn_up: [
            { date: "2026-11-04", total: 20, completed: 0 },
            { date: "2026-11-05", total: 28, completed: 24 },
            { date: "2026-11-06", total: 28, completed: 25 },
          ],
        },
      }),
    );
    await page.emulateMedia({ colorScheme: variant, reducedMotion: "reduce" });
    if (variant === "dark")
      await page.setViewportSize({ width: 375, height: 500 });
    await page.goto(`/projects/${key}`);
    await page.locator("button.board-summary").click();
    const popover = page.getByRole("dialog", { name: "Proje özeti" });
    const chart = popover.locator(".summary-chart-interaction");
    await expect(
      popover.getByRole("img", { name: /Toplam 28 iş, 25 bitti/ }),
    ).toBeVisible();
    await expect(popover).not.toContainText(
      /Burn-up|burn-up|Son 30 gün|kesikli çizgi|düz çizgi/,
    );
    await expect(
      popover.locator("figcaption, .summary-legend, .summary-axis"),
    ).toHaveCount(0);
    await expect(popover.locator(".summary-total-label")).toHaveText("28 iş");
    await expect(popover.locator(".summary-completed-label")).toHaveText(
      "25 bitti",
    );
    await expect(popover.locator(".summary-dates")).toHaveText("4 KasBugün");
    const labels = await popover
      .locator(".summary-total-label, .summary-completed-label")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()),
      );
    expect(labels[0].bottom).toBeLessThanOrEqual(labels[1].top);
    const bounds = await chart.boundingBox();
    if (!bounds) throw new Error("Grafik bulunamadı");
    await page.mouse.move(
      bounds.x + (bounds.width * 112) / 320,
      bounds.y + bounds.height / 2,
    );
    const tooltip = popover.locator(".summary-chart-tooltip");
    await expect(tooltip).toHaveText("5 Kas · 24 / 28 bitti");
    await expect(tooltip).toHaveAttribute("data-visible", "true");
    await expect(popover.locator(".summary-cursor")).toHaveCount(1);
    await chart.evaluate((node) => (node as HTMLElement).blur());
    await chart.focus();
    await expect(tooltip).toHaveText("6 Kas · 25 / 28 bitti");
    await page.keyboard.press("ArrowLeft");
    await expect(tooltip).toHaveText("5 Kas · 24 / 28 bitti");
    await expect(chart.locator('[aria-live="polite"]')).toHaveText(
      "5 Kas · 24 / 28 bitti",
    );
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(tooltip).toHaveText("4 Kas · 0 / 20 bitti");
    await page.keyboard.press("ArrowRight");
    await expect(tooltip).toHaveText("5 Kas · 24 / 28 bitti");
    const box = await popover.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport)
      throw new Error("Popover veya ekran ölçüsü bulunamadı");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
    await expect(page.locator("button.board-summary")).toBeFocused();
  });
}

test.describe("dokunmatik ve seçili dil", () => {
  test.use({ hasTouch: true });

  test("İngilizce tarihler, eşit değerler ve dokunarak gün seçimi", async ({
    page,
    request,
  }) => {
    expect(
      (
        await request.post("/api/v1/projects", {
          data: { key: "CHARTTOUCH", name: "Touch chart" },
        })
      ).ok(),
    ).toBe(true);
    await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route("**/api/v1/projects/CHARTTOUCH/summary", (route) =>
      route.fulfill({
        json: {
          started_at: "2026-11-05T12:00:00.000Z",
          total: 28,
          completed: 28,
          remaining: 0,
          cancelled: 0,
          remaining_by_priority: { high: 0, medium: 0, low: 0 },
          completed_last_7_days: 28,
          burn_up: [
            { date: "2026-11-05", total: 5, completed: 0 },
            { date: "2026-11-06", total: 28, completed: 28 },
          ],
        },
      }),
    );
    await page.goto("/projects/CHARTTOUCH");
    const summary = page.locator("button.board-summary");
    await expect(summary).toContainText("Nov 5");
    await summary.tap();
    const popover = page.getByRole("dialog", { name: "Project summary" });
    await expect(popover.locator(".summary-dates")).toHaveText("Nov 5Today");
    await expect(popover.locator(".summary-total-label")).toHaveText(
      "28 items",
    );
    await expect(popover.locator(".summary-completed-label")).toHaveText(
      "28 done",
    );
    const labels = await popover
      .locator(".summary-total-label, .summary-completed-label")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()),
      );
    expect(labels[0].bottom).toBeLessThanOrEqual(labels[1].top);
    const bounds = await popover
      .locator(".summary-chart-interaction")
      .boundingBox();
    if (!bounds) throw new Error("Grafik bulunamadı");
    await page.touchscreen.tap(
      bounds.x + (bounds.width * 8) / 320,
      bounds.y + bounds.height / 2,
    );
    const tooltip = popover.locator(".summary-chart-tooltip");
    await expect(tooltip).toHaveAttribute("data-visible", "true");
    await expect(tooltip).toHaveText("Nov 5 · 0 / 5 done");
    await page.touchscreen.tap(
      bounds.x + (bounds.width * 216) / 320,
      bounds.y + bounds.height / 2,
    );
    await expect(tooltip).toHaveText("Nov 6 · 28 / 28 done");
  });
});

test("boş projede açıklama ve mobil koyu tema", async ({ page, request }) => {
  expect(
    (
      await request.post("/api/v1/projects", {
        data: { key: "EMPTYSMRY", name: "Boş özet" },
      })
    ).ok(),
  ).toBe(true);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/projects/EMPTYSMRY");
  await page.locator("button.board-summary").click();
  const popover = page.getByRole("dialog", { name: "Proje özeti" });
  await expect(popover).toContainText("Henüz PBI yok.");
  await expect(popover.getByRole("img")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
