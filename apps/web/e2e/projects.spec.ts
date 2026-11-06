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

test("proje ayarları adı kaydeder, kuralları uygular ve satır içi onayla arşivler", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "AYAR", name: "Ayar denemesi" },
  });
  await page.request.post("/api/v1/projects/AYAR/items", {
    data: { title: "Testte bekleyen" },
  });
  await page.request.patch("/api/v1/items/AYAR-1", {
    data: { status: "test" },
  });
  await page.goto("/projects/AYAR");
  const openSettings = () =>
    page.getByRole("button", { name: "Proje ayarları" }).click();
  const dialog = page.getByRole("dialog");
  await openSettings();
  await expect(page.getByLabel("Anahtar")).toHaveJSProperty("readOnly", true);
  await expect(page.getByLabel("Anahtar")).toHaveValue("AYAR");
  const save = page.getByRole("button", { name: "Kaydet", exact: true });

  // Closing the Test column needs a destination for the waiting card.
  await page.getByRole("switch", { name: "Test kolonu" }).click();
  await expect(save).toBeDisabled();
  await page.getByLabel("Test kartları nereye taşınsın?").selectOption("done");
  await expect(save).toBeEnabled();

  // Test and AI cannot both be off.
  await page.getByRole("switch", { name: "AI Done'a çekebilir" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Test kolonu kapalıysa AI Done'a çekebilmelidir.",
  );
  await expect(save).toBeDisabled();
  await page.getByRole("switch", { name: "AI Done'a çekebilir" }).click();
  await page.getByRole("switch", { name: "Test kolonu" }).click();

  await page.getByLabel("Proje adı").fill("Yeni ayar adı");
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(
    page.getByText("Kaydedilmemiş değişikliklerin var", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Düzenlemeye devam et" }).click();
  await save.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".toolbar h1")).toHaveText("Yeni ayar adı");

  await openSettings();
  await page.getByRole("button", { name: "Projeyi arşivle…" }).click();
  await expect(page.getByText("Proje arşivlensin mi?")).toBeVisible();
  await expect(
    page.getByText("Board listeden kalkar, Arşiv'den geri alabilirsin."),
  ).toBeVisible();
  await expect(save).toHaveCount(0);
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(
    page.getByRole("button", { name: "Projeyi arşivle…" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Projeyi arşivle…" }).click();
  await page.getByRole("button", { name: "Arşivle", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/");
  await expect(page.locator("aside")).not.toContainText("Yeni ayar adı");
});

test("sol panel tek listede yıldızlıyı üstte ve aktif projeyi vurgulu gösterir", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "SIDEA", name: "Yıldızsız panel" },
  });
  await page.request.post("/api/v1/projects", {
    data: { key: "SIDEB", name: "Yıldızlı panel" },
  });
  await page.request.post("/api/v1/projects/SIDEB/star", {
    data: { starred: true },
  });
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/projects/SIDEA");
  const sidebar = page.locator("aside");
  await expect(
    sidebar.locator(".nav-label", { hasText: "Yıldızlı" }),
  ).toHaveCount(0);
  const links = sidebar.locator("a.nav-project").filter({ hasText: "panel" });
  await expect(links.nth(0)).toContainText("Yıldızlı panel");
  await expect(
    links.nth(0).getByRole("img", { name: "Yıldızlı" }),
  ).toBeVisible();
  await expect(links.nth(1).getByRole("img", { name: "Yıldızlı" })).toHaveCount(
    0,
  );
  await expect(links.nth(1)).toHaveAttribute("aria-current", "page");
  await expect(links.nth(0)).not.toHaveAttribute("aria-current", "page");

  // The sidebar stays full height and pinned while a long page scrolls.
  await page.evaluate(() => {
    document.querySelector("main")?.append(
      Object.assign(document.createElement("div"), {
        style: "height: 2000px",
      }),
    );
    window.scrollTo(0, 1000);
  });
  const box = await sidebar.boundingBox();
  expect(box?.y).toBe(0);
  expect(box?.height).toBe(600);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Seni bekliyor satırı en eski önce listelenir ve kartı doğrudan açar", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "WAIT", name: "Bekleme denemesi" },
  });
  for (const title of ["Sonra gönderilen", "Önce gönderilen"])
    await page.request.post("/api/v1/projects/WAIT/items", {
      data: { title, priority: "high" },
    });
  const send = (key: string) =>
    page.request.patch(`/api/v1/items/${key}`, {
      data: { status: "test", assignee: "mert" },
      headers: { "X-Pano-Actor": "claude:po" },
    });
  await send("WAIT-2");
  await page.waitForTimeout(5);
  await send("WAIT-1");
  await page.request.post("/api/v1/items/WAIT-2/scenarios", {
    data: { steps_md: "Aç", expected_md: "Açılır", author: "claude:po" },
    headers: { "X-Pano-Actor": "claude:po" },
  });
  await page.goto("/waiting");
  await expect(page.getByText(/Test etmeni bekleyen işler\./)).toContainText(
    "iş · en eski önce",
  );
  const group = page
    .locator(".waiting-group")
    .filter({ hasText: "Bekleme denemesi" });
  await expect(group.locator(".waiting-group-head")).toContainText("2 iş");
  const rows = group.getByRole("link");
  await expect(rows.nth(0)).toContainText("WAIT-2");
  await expect(rows.nth(0)).toContainText("Yüksek");
  await expect(rows.nth(0)).toContainText("1 senaryo · Claude · PO");
  await expect(rows.nth(1)).toContainText("WAIT-1");
  await expect(rows.nth(1)).not.toContainText("senaryo");
  await rows.nth(0).click();
  await expect(page).toHaveURL("/projects/WAIT");
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Önce gönderilen" }),
  ).toBeVisible();
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
