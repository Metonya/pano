import { expect, test } from "@playwright/test";

test.describe("local day boundary", () => {
  test.use({ timezoneId: "Europe/Istanbul" });
  test("projects opened yesterday show the date even within the same UTC day", async ({
    page,
    request,
  }) => {
    await page.clock.setFixedTime(new Date("2026-11-06T22:30:00Z"));
    await request.post("/api/v1/projects", {
      data: { key: "LOCALDAY", name: "Local day" },
    });
    await page.route("**/api/v1/projects/LOCALDAY/summary*", (route) =>
      route.fulfill({
        json: {
          started_at: "2026-11-06T10:00:00Z",
          total: 25,
          completed: 25,
          remaining: 0,
          cancelled: 0,
          remaining_by_priority: { high: 0, medium: 0, low: 0 },
          completed_last_7_days: 25,
          burn_up: [{ date: "2026-11-06", total: 25, completed: 25 }],
        },
      }),
    );
    await page.goto("/projects/LOCALDAY");
    await page.locator("button.board-summary").click();
    await expect(
      page.getByRole("dialog", { name: "Project summary" }),
    ).toContainText("Opened on Nov 6, 25 tasks completed");
    await expect(
      page.getByRole("dialog", { name: "Project summary" }),
    ).not.toContainText("Opened today");
  });
});

test("summary counts, Done over SSE and popover keyboard behavior", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post("/api/v1/projects", {
        data: { key: "SUMMARY", name: "Summary" },
      })
    ).ok(),
  ).toBe(true);
  for (const priority of ["high", "medium", "low", "medium"]) {
    expect(
      (
        await request.post("/api/v1/projects/SUMMARY/items", {
          data: { title: `Item ${priority}`, priority },
        })
      ).ok(),
    ).toBe(true);
  }
  expect(
    (
      await request.post("/api/v1/items/SUMMARY-4/move", {
        data: { status: "cancelled", reason: "Duplicate" },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/projects/SUMMARY");
  const summary = page.locator("button.board-summary");
  await expect(summary).toContainText("0 / 3 completed");
  await expect(summary).toContainText("3 remaining");
  await expect(summary).toContainText("1 high priority");
  await expect(summary).toHaveAttribute("aria-haspopup", "dialog");
  await expect(summary).toHaveAccessibleName(/Total 3, 0 completed/);
  await summary.focus();
  await page.keyboard.press("Enter");
  const popover = page.getByRole("dialog", { name: "Project summary" });
  await expect(popover).toBeVisible();
  await expect(
    popover.locator("dl > div").filter({ hasText: "Cancelled" }).locator("dd"),
  ).toHaveText("1");
  await expect(popover.getByRole("img")).toHaveCount(0);
  await expect(popover).toContainText("Opened today, no items completed yet");
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
  await expect(summary).toContainText("1 / 3 completed");
  await expect(summary).toHaveAccessibleName(/Total 3, 1 completed/);
  await expect(summary).toContainText("2 remaining");
  await expect(summary).toContainText("0 high priority");
  await summary.click();
  await expect(
    popover
      .locator("dl > div")
      .filter({ hasText: "Completed in the last 7 days" })
      .locator("dd"),
  ).toHaveText("1");
  await expect(popover).toContainText("Opened today, 1 items completed");
});

for (const variant of ["light", "dark"] as const) {
  test(`chart labels, mouse, keyboard and viewport bounds: ${variant}`, async ({
    page,
    request,
  }) => {
    await page.clock.setFixedTime(new Date("2026-11-06T12:00:00Z"));
    const key = variant === "light" ? "CHARTLIGHT" : "CHARTDARK";
    expect(
      (
        await request.post("/api/v1/projects", {
          data: { key, name: "Chart" },
        })
      ).ok(),
    ).toBe(true);
    await page.route(`**/api/v1/projects/${key}/summary*`, (route) =>
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
    const popover = page.getByRole("dialog", { name: "Project summary" });
    const chart = popover.locator(".summary-chart-interaction");
    await expect(
      popover.getByRole("img", { name: /28 items, 25 completed/ }),
    ).toBeVisible();
    await expect(popover).not.toContainText(
      /Burn-up|burn-up|Last 30 days|dashed line|solid line/,
    );
    await expect(
      popover.locator("figcaption, .summary-legend, .summary-axis"),
    ).toHaveCount(0);
    await expect(popover.locator(".summary-total-label")).toHaveText(
      "28 items",
    );
    await expect(popover.locator(".summary-completed-label")).toHaveText(
      "25 done",
    );
    await expect(popover.locator(".summary-dates")).toHaveText("Nov 4Today");
    const labels = await popover
      .locator(".summary-total-label, .summary-completed-label")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()),
      );
    expect(labels[0].bottom).toBeLessThanOrEqual(labels[1].top);
    const bounds = await chart.boundingBox();
    if (!bounds) throw new Error("Chart not found");
    await page.mouse.move(
      bounds.x + (bounds.width * 112) / 320,
      bounds.y + bounds.height / 2,
    );
    const tooltip = popover.locator(".summary-chart-tooltip");
    await expect(tooltip).toHaveText("Nov 5 · 24 / 28 done");
    await expect(tooltip).toHaveAttribute("data-visible", "true");
    await expect(popover.locator(".summary-cursor")).toHaveCount(1);
    await chart.evaluate((node) => (node as HTMLElement).blur());
    await chart.focus();
    await expect(tooltip).toHaveText("Nov 6 · 25 / 28 done");
    await page.keyboard.press("ArrowLeft");
    await expect(tooltip).toHaveText("Nov 5 · 24 / 28 done");
    await expect(chart.locator('[aria-live="polite"]')).toHaveText(
      "Nov 5 · 24 / 28 done",
    );
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(tooltip).toHaveText("Nov 4 · 0 / 20 done");
    await page.keyboard.press("ArrowRight");
    await expect(tooltip).toHaveText("Nov 5 · 24 / 28 done");
    const box = await popover.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport)
      throw new Error("Popover or viewport bounds not found");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
    await expect(page.locator("button.board-summary")).toBeFocused();
  });
}

test.describe("touch and selected language", () => {
  test.use({ hasTouch: true });

  test("English dates, equal values and day selection by touch", async ({
    page,
    request,
  }) => {
    await page.clock.setFixedTime(new Date("2026-11-06T12:00:00Z"));
    expect(
      (
        await request.post("/api/v1/projects", {
          data: { key: "CHARTTOUCH", name: "Touch chart" },
        })
      ).ok(),
    ).toBe(true);
    await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route("**/api/v1/projects/CHARTTOUCH/summary*", (route) =>
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
    if (!bounds) throw new Error("Chart not found");
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

test("empty project explanation and mobile dark theme", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post("/api/v1/projects", {
        data: { key: "EMPTYSMRY", name: "Empty summary" },
      })
    ).ok(),
  ).toBe(true);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/projects/EMPTYSMRY");
  await page.locator("button.board-summary").click();
  const popover = page.getByRole("dialog", { name: "Project summary" });
  await expect(popover).toContainText("No PBIs yet.");
  await expect(popover.getByRole("img")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
