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
  await expect(popover.getByRole("img", { name: /Son 30 gün/ })).toBeVisible();
  await expect(popover.locator("polyline").first()).toHaveAttribute(
    "points",
    /^(\S+ ){29}\S+$/,
  );
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
