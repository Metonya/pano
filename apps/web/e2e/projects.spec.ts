import { expect, test } from "@playwright/test";

test("proje oluşturulur, yıldızlanır, arşivlenir ve geri alınır", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Yeni proje" }).first().click();
  await page.getByLabel("Proje adı").fill("Deneme proje");
  await expect(page.getByLabel("Key", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("PBI'lar DP-1, DP-2 diye numaralanır"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Oluştur" }).click();
  const card = page.locator("article").filter({ hasText: "Deneme proje" });
  await expect(card).toBeVisible();
  await expect(
    card.getByRole("link", { name: "Deneme proje" }),
  ).toHaveAttribute("href", "/projects/DP");
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
  await page.getByRole("button", { name: /^Arşiv/ }).click();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: "Diğer işlemler Deneme proje" })
    .click();
  await page.getByRole("menuitem", { name: "Arşivden çıkar" }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "Projeler", exact: true }).click();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  if (!box) throw new Error("Project card is not visible");
  await page.mouse.click(box.x + 30, box.y + box.height - 15);
  await expect(page).toHaveURL(/\/projects\/DP$/);
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
