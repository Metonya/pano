import { expect, test } from "@playwright/test";

test("Değiştir key'i açar; elle düzenlenen değer korunur ve hatalar gösterilir", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Yeni proje" }).first().click();
  await page.getByLabel("Proje adı").fill("Örnek Proje");
  await page.getByRole("button", { name: "Değiştir" }).click();
  const key = page.getByLabel("Key", { exact: true });
  await key.fill("küçük");
  await page.getByLabel("Proje adı").fill("Başka ad");
  await page.waitForTimeout(400);
  await expect(key).toHaveValue("küçük");
  await page.getByRole("button", { name: "Oluştur", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Key 2–10 büyük harf veya rakam içermeli.",
  );
  // Create the conflicting key in this test so it also runs independently.
  await page.request.post("/api/v1/projects", {
    data: { name: "Dolu key", key: "TAKEN" },
  });
  await key.fill("TAKEN");
  await page.getByRole("button", { name: "Oluştur", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Bu key zaten kullanılıyor.",
  );
  await key.fill("CUSTOM");
  await page.getByRole("button", { name: "Oluştur", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .locator("article")
      .filter({ hasText: "Başka ad" })
      .getByRole("link", { name: "Başka ad" }),
  ).toHaveAttribute("href", "/projects/CUSTOM");
});

test("boş ve sıfırlanmış form kapanır; dolu form tüm kapatma yollarında sorar", async ({
  page,
}) => {
  await page.goto("/");
  const open = () =>
    page.getByRole("button", { name: "Yeni proje" }).first().click();
  const outside = () => page.mouse.click(5, 5);
  const dialog = page.getByRole("dialog");
  await open();
  await outside();
  await expect(dialog).toHaveCount(0);
  await open();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await open();
  await page.getByLabel("Proje adı").fill("Taslak");
  for (const close of [
    outside,
    () => page.keyboard.press("Escape"),
    () => page.getByRole("button", { name: "Vazgeç" }).click(),
    () => page.getByRole("button", { name: "Kapat", exact: true }).click(),
  ]) {
    await page.waitForTimeout(250); // let the open animation settle
    const before = await dialog.boundingBox();
    if (!before) throw new Error("Dialog is not visible");
    await close();
    const after = await dialog.boundingBox();
    if (!after) throw new Error("Dialog is not visible");
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    await expect(
      page.getByText("Kaydedilmemiş değişikliklerin var", { exact: true }),
    ).toBeVisible();
    await expect(dialog).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Düzenlemeye devam et" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Düzenlemeye devam et" }).click();
    await expect(page.getByLabel("Proje adı")).toHaveValue("Taslak");
  }
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Kaydetmeden kapat" }).click();
  await expect(dialog).toHaveCount(0);
  await open();
  await expect(page.getByLabel("Proje adı")).toHaveValue("");
  await page.getByLabel("Proje adı").fill("Geri al");
  await page.getByLabel("Proje adı").fill("");
  await outside();
  await expect(dialog).toHaveCount(0);
});

test("kalıcı silmede dışarı tıklama engellenir; Esc ve Vazgeç sorusuz kapatır", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "DEL", name: "Silme denemesi" },
  });
  await page.request.post("/api/v1/projects/DEL/archive", {
    data: { archived: true },
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Arşiv/ }).click();
  const open = async () => {
    await page
      .locator("article")
      .filter({ hasText: "Silme denemesi" })
      .getByRole("button", { name: "Diğer işlemler Silme denemesi" })
      .click();
    await page
      .getByRole("menuitem", { name: "Kalıcı olarak sil…", exact: true })
      .click();
  };
  await open();
  await page.getByLabel("Proje adı").fill("Silme");
  await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("Kaydedilmemiş değişikliklerin var", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open();
  await page.getByLabel("Proje adı").fill("Silme");
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open();
  await expect(page.getByLabel("Proje adı")).toHaveValue("");
  await page.getByLabel("Proje adı").fill("Silme");
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Pano linki ana sayfaya gider ve mobil menüyü kapatır", async ({
  page,
}) => {
  await page.goto("/waiting");
  const brand = page.getByRole("link", { name: "Pano", exact: true });
  await expect(brand).toHaveAttribute("href", "/");
  await brand.focus();
  await expect(brand).toBeFocused();
  await brand.press("Enter");
  await expect(page).toHaveURL("/");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/waiting");
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await brand.click();
  await expect(page).toHaveURL("/");
  await expect(page.locator("aside")).not.toHaveClass(/mobile-open/);
});
