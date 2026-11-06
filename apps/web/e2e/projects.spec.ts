import { expect, test } from "@playwright/test";

test("proje oluşturulur, yıldızlanır, arşivlenir ve geri alınır", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Yeni proje" }).first().click();
  await page.getByLabel("Proje adı").fill("Deneme proje");
  await page.getByLabel("Key", { exact: true }).fill("DEMO");
  await page.getByRole("button", { name: "Oluştur" }).click();
  const card = page.locator("article").filter({ hasText: "Deneme proje" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Yıldızla Deneme proje" }).click();
  await expect(
    card.getByRole("button", { name: "Yıldızı kaldır Deneme proje" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    card.getByRole("button", { name: "Yıldızı kaldır Deneme proje" }),
  ).toBeVisible();
  await card
    .getByRole("button", { name: "Diğer işlemler Deneme proje" })
    .click();
  await page.getByRole("menuitem", { name: "Arşivle", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "Arşiv", exact: true }).click();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: "Diğer işlemler Deneme proje" })
    .click();
  await page.getByRole("menuitem", { name: "Arşivden çıkar" }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "Aktif", exact: true }).click();
  await expect(card).toBeVisible();
});

test("mobil görünümde yatay taşma yok ve dark sistem teması uygulanır", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Menüyü aç" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg")
        .trim(),
    ),
  ).toBe("#000");
});
