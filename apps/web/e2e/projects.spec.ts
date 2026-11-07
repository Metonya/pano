import { expect, test } from "@playwright/test";
import { onlyProjects } from "./helpers";

test("proje oluşturulur, yıldızlanır, arşivlenir ve geri alınır", async ({
  page,
}) => {
  await onlyProjects(page, "DP");
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
  await expect(page.getByLabel("Key", { exact: true })).toHaveJSProperty(
    "readOnly",
    true,
  );
  await expect(page.getByLabel("Key", { exact: true })).toHaveValue("AYAR");
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

test("proje açıklaması yazılır ve silinir, boş kartta metin çıkmaz", async ({
  page,
}) => {
  await onlyProjects(page, "ACIK");
  await page.request.post("/api/v1/projects", {
    data: { key: "ACIK", name: "Açıklama denemesi" },
  });
  await page.request.post("/api/v1/projects/ACIK/star", {
    data: { starred: true },
  });
  await page.goto("/");
  const card = page.locator("article").filter({ hasText: "Açıklama denemesi" });
  const description = card.locator(".description");
  const settings = async () => {
    await card
      .getByRole("button", { name: "Diğer işlemler Açıklama denemesi" })
      .click();
    await page.getByRole("menuitem", { name: "Proje ayarları" }).click();
  };
  const dialog = page.getByRole("dialog");
  const field = dialog.getByLabel("Açıklama", { exact: true });
  const save = dialog.getByRole("button", { name: "Kaydet", exact: true });

  await expect(card).toBeVisible();
  await expect(description).toHaveCount(0);
  await expect(card).not.toContainText("Açıklama yok");
  const emptyHeight = (await card.boundingBox())?.height ?? 0;

  await settings();
  await expect(field).toHaveValue("");
  await field.fill("Takımın ortak panosu");
  // An unsaved description counts as a change.
  await dialog.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(
    page.getByText("Kaydedilmemiş değişikliklerin var", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Düzenlemeye devam et" }).click();
  await save.click();
  await expect(dialog).toHaveCount(0);
  await expect(description).toHaveText("Takımın ortak panosu");
  expect((await card.boundingBox())?.height ?? 0).toBeGreaterThan(emptyHeight);

  await settings();
  await expect(field).toHaveValue("Takımın ortak panosu");
  await field.fill("");
  await save.click();
  await expect(dialog).toHaveCount(0);
  await expect(description).toHaveCount(0);
  await expect(card).not.toContainText("Açıklama yok");
  expect((await card.boundingBox())?.height).toBe(emptyHeight);
  const saved = await page.request.get("/api/v1/projects/ACIK");
  expect((await saved.json()).description).toBe("");
});

test("açıklaması olmayan PBI'da başlık ve Düzenle kalır, boş metin çıkmaz", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "BOSPBI", name: "Boş PBI" },
  });
  await page.request.post("/api/v1/projects/BOSPBI/items", {
    data: { title: "Açıklamasız iş" },
  });
  await page.goto("/projects/BOSPBI");
  await page
    .locator(".board-card")
    .filter({ hasText: "Açıklamasız iş" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Açıklama", exact: true }),
  ).toBeVisible();
  await expect(dialog).not.toContainText("Açıklama yok");
  await expect(
    dialog
      .locator(".sheet-section")
      .filter({ has: page.getByRole("heading", { name: "Açıklama" }) })
      .getByRole("button", { name: "Düzenle" }),
  ).toBeVisible();
});

test("kart menüsü ayarları aynı sayfada açar, yıldız kartta kalır", async ({
  page,
}) => {
  await onlyProjects(page, "MENU");
  await page.request.post("/api/v1/projects", {
    data: { key: "MENU", name: "Menü denemesi" },
  });
  await page.goto("/");
  const card = page.locator("article").filter({ hasText: "Menü denemesi" });
  const menu = page.getByRole("menu");
  const trigger = card.getByRole("button", {
    name: "Diğer işlemler Menü denemesi",
  });

  await trigger.click();
  await expect(menu.getByRole("menuitem").first()).toHaveText("Proje ayarları");
  await expect(menu.getByRole("menuitem", { name: /Yıldız/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "Arşivle" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);

  // The right-click menu has the same content.
  await card.click({ button: "right", position: { x: 30, y: 30 } });
  await expect(menu.getByRole("menuitem").first()).toHaveText("Proje ayarları");
  await expect(menu.getByRole("menuitem", { name: /Yıldız/ })).toHaveCount(0);

  await menu.getByRole("menuitem", { name: "Proje ayarları" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Key", { exact: true })).toHaveValue("MENU");
  await expect(page).toHaveURL("/");
  await dialog.getByRole("button", { name: "Vazgeç" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/");
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");

  // The star button on the card still works.
  await card.getByRole("button", { name: "Yıldızla Menü denemesi" }).click();
  await expect(
    card.getByRole("button", { name: "Yıldızı kaldır Menü denemesi" }),
  ).toBeVisible();

  // An archived project has no settings entry.
  await trigger.click();
  await menu.getByRole("menuitem", { name: "Arşivle", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: /^Arşiv/ }).click();
  await trigger.click();
  await expect(
    menu.getByRole("menuitem", { name: "Arşivden çıkar" }),
  ).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Proje ayarları" }),
  ).toHaveCount(0);
});

test("büyük kartta alt satır tek satırdır: göreli tarih ve aktif agent sayısı", async ({
  page,
}) => {
  await onlyProjects(page, "AGSIFIR", "AGIKI");
  for (const [key, name] of [
    ["AGSIFIR", "Agentsiz kart"],
    ["AGIKI", "İki agentli kart"],
  ] as const) {
    await page.request.post("/api/v1/projects", { data: { key, name } });
    await page.request.post(`/api/v1/projects/${key}/star`, {
      data: { starred: true },
    });
  }
  // Three items, two different agents; the person does not count.
  for (const assignee of ["claude:a", "claude:a", "codex:b", "mert"]) {
    const created = await page.request.post("/api/v1/projects/AGIKI/items", {
      data: { title: `İş ${assignee}` },
    });
    await page.request.patch(`/api/v1/items/${(await created.json()).key}`, {
      data: { status: "in_progress", assignee },
    });
  }
  await page.goto("/");
  const zero = page.locator("article").filter({ hasText: "Agentsiz kart" });
  const two = page.locator("article").filter({ hasText: "İki agentli kart" });
  const accent = await page.evaluate(() => {
    const probe = document.createElement("i");
    probe.style.color = "var(--accent)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });

  await expect(two.locator(".foot-agents")).toHaveText("2 aktif agent");
  await expect(two.locator(".foot-dot")).toHaveCSS("background-color", accent);
  await expect(zero.locator(".foot-agents")).toHaveText("0 aktif agent");
  await expect(zero.locator(".foot-dot")).not.toHaveCSS(
    "background-color",
    accent,
  );
  await expect(zero).not.toContainText("Agent yok");

  const updatedAt = (
    await (await page.request.get("/api/v1/projects/AGIKI")).json()
  ).updated_at as string;
  const time = two.locator(".card-foot time");
  await expect(two.locator(".foot-updated")).toHaveText("Güncellendi az önce");
  await expect(time).toHaveAttribute("datetime", updatedAt);
  await expect(time).toHaveAttribute("title", /2\d{3}/);

  for (const width of [1440, 375, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const foot = await two.locator(".card-foot").evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      padding: Number.parseFloat(getComputedStyle(el).paddingTop),
      fits: el.scrollWidth <= el.clientWidth,
    }));
    expect(foot.fits).toBe(true);
    // Border, padding and one 13px line: a second line would add about 20px.
    expect(foot.height - foot.padding).toBeLessThan(26);
    const single = await time.evaluate(
      (el) =>
        el.getClientRects().length === 1 &&
        el.scrollWidth <= el.clientWidth + 1,
    );
    expect(single).toBe(true);
  }

  // The whole card still opens the board.
  await page.setViewportSize({ width: 1440, height: 800 });
  const foot = await two.locator(".foot-agents").boundingBox();
  if (!foot) throw new Error("Agent indicator is not visible");
  await page.mouse.click(foot.x + 4, foot.y + 4);
  await expect(page).toHaveURL(/\/projects\/AGIKI$/);
});

test("aktif agent araç düzeyinde sayılır: üç Claude rolü ve Codex iki eder", async ({
  page,
}) => {
  await onlyProjects(page, "AGROL");
  await page.request.post("/api/v1/projects", {
    data: { key: "AGROL", name: "Rollü kart" },
  });
  await page.request.post("/api/v1/projects/AGROL/star", {
    data: { starred: true },
  });
  for (const assignee of [
    "claude:kimlik",
    "claude:kullanim",
    "claude:po",
    "codex",
    "mert",
  ]) {
    const created = await page.request.post("/api/v1/projects/AGROL/items", {
      data: { title: `İş ${assignee}` },
    });
    await page.request.patch(`/api/v1/items/${(await created.json()).key}`, {
      data: { status: "in_progress", assignee },
    });
  }
  await page.goto("/");
  const card = page.locator("article").filter({ hasText: "Rollü kart" });
  await expect(card.locator(".foot-agents")).toHaveText("2 aktif agent");
  const saved = await page.request.get("/api/v1/projects");
  const project = (await saved.json()).find(
    (entry: { key: string }) => entry.key === "AGROL",
  );
  expect(project.agents).toBe(2);
});

test("küçük kartta butonlar yer tutmaz, hover ve Tab ile görünür", async ({
  page,
}) => {
  await onlyProjects(page, "KUCUK");
  const name = "Çok uzun adlı küçük kart ".repeat(4).trim();
  await page.request.post("/api/v1/projects", {
    data: { key: "KUCUK", name },
  });
  await page.request.post("/api/v1/projects/KUCUK/items", {
    data: { title: "Açık iş" },
  });
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");
  await page.mouse.move(0, 0);
  const card = page.locator("article").filter({ hasText: "küçük kart" });
  const link = card.getByRole("link");
  const star = card.getByRole("button", { name: /^Yıldızla / });
  const more = card.getByRole("button", { name: /^Diğer işlemler / });
  const info = card.locator(".card-info");

  await expect(info).toContainText("1 açık iş");
  await expect(info.locator("time")).toHaveText("az önce");
  await expect(info.locator("time")).toHaveAttribute("title", /2\d{3}/);
  expect((await info.boundingBox())?.height).toBeLessThan(24);
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "0");
  const rest = await card.boundingBox();
  // The title runs under the hidden buttons up to the card's padding.
  const title = await card.locator("h3").boundingBox();
  expect((title?.x ?? 0) + (title?.width ?? 0)).toBeCloseTo(
    (rest?.x ?? 0) + (rest?.width ?? 0) - 25,
    0,
  );

  await card.hover();
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "1");
  for (const button of [star, more]) {
    const box = await button.boundingBox();
    expect(box?.width).toBe(28);
    expect(box?.height).toBe(28);
  }
  expect((await card.boundingBox())?.height).toBe(rest?.height);

  // Stays visible while its menu is open, even with the pointer gone.
  await more.click();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(more).toBeFocused();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "0");

  // Reachable by keyboard: hidden with opacity, not removed.
  await link.focus();
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Tab");
  await expect(star).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(more).toBeFocused();

  // Touch size and always visible on the narrow layout, next to the text.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.setViewportSize({ width: 375, height: 812 });
  await page.mouse.move(0, 0);
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "1");
  for (const button of [star, more]) {
    const box = await button.boundingBox();
    expect(box?.width).toBe(44);
    expect(box?.height).toBe(44);
  }
  const titleBox = await card.locator(".project-title").boundingBox();
  const starBox = await star.boundingBox();
  expect((titleBox?.x ?? 0) + (titleBox?.width ?? 0)).toBeLessThanOrEqual(
    starBox?.x ?? 0,
  );
  await expect(info.locator("time")).toHaveText("az önce");
  expect(
    await info
      .locator("time")
      .evaluate((el) => el.getBoundingClientRect().right),
  ).toBeLessThanOrEqual(starBox?.x ?? 0);
});

test.describe("uzun dil", () => {
  test.use({ locale: "de-DE" });
  test("sayı etiketleri ve alt satır taşmaz", async ({ page }) => {
    await onlyProjects(page, "DEUTSCH");
    await page.request.post("/api/v1/projects", {
      data: { key: "DEUTSCH", name: "Deutsche Karte" },
    });
    await page.request.post("/api/v1/projects/DEUTSCH/star", {
      data: { starred: true },
    });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    const card = page.locator("article").filter({ hasText: "Deutsche Karte" });
    await expect(card.locator(".foot-agents")).toHaveText("Aktive Agents: 0");
    for (const area of [".counts", ".card-foot"]) {
      const fits = await card
        .locator(area)
        .evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(fits).toBe(true);
    }
    const labels = card.locator(".counts span");
    for (let i = 0; i < 4; i += 1) {
      expect((await labels.nth(i).boundingBox())?.height).toBeLessThan(22);
    }
    // The time stays whole; only the label before it may give way.
    const time = card.locator(".card-foot time");
    const agents = await card.locator(".foot-agents").boundingBox();
    expect(
      await time.evaluate((el) => el.getBoundingClientRect().right),
    ).toBeLessThanOrEqual(agents?.x ?? 0);
  });
});

test("sol panel tek listede yıldızlıyı üstte ve aktif projeyi vurgulu gösterir", async ({
  page,
}) => {
  await onlyProjects(page, "SIDEA", "SIDEB");
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
  const rows = sidebar.locator(".nav-project-row").filter({ hasText: "panel" });
  await expect(links.nth(0)).toContainText("Yıldızlı panel");
  await expect(
    rows.nth(0).getByRole("button", { name: "Yıldızı kaldır" }),
  ).toBeVisible();
  await expect(rows.nth(1).getByRole("button", { name: "Yıldızla" })).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(links.nth(1)).toHaveAttribute("aria-current", "page");
  await expect(rows.nth(1)).toHaveClass(/is-active/);
  await expect(links.nth(0)).not.toHaveAttribute("aria-current", "page");

  // The sidebar stays full height and pinned; a long page scrolls inside main.
  await page.evaluate(() => {
    document.querySelector(".content")?.append(
      Object.assign(document.createElement("div"), {
        style: "height: 2000px; flex-shrink: 0",
      }),
    );
    document.querySelector(".content")?.scrollTo(0, 1000);
    window.scrollTo(0, 1000);
  });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator(".toolbar")).toBeInViewport();
  const box = await sidebar.boundingBox();
  expect(box?.y).toBe(0);
  expect(box?.height).toBe(600);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("sol paneldeki yıldız projeyi üste alır ve sayfayı değiştirmez", async ({
  page,
}) => {
  await onlyProjects(page, "STARZ", "STARB");
  await page.request.post("/api/v1/projects", {
    data: { key: "STARZ", name: "Durak bir" },
  });
  // Newer and earlier in key order, so it starts above the project to star.
  await page.request.post("/api/v1/projects", {
    data: { key: "STARB", name: "Durak iki" },
  });
  await page.goto("/waiting");
  const sidebar = page.locator("aside");
  const pair = sidebar.locator(".nav-project-row").filter({ hasText: "Durak" });
  const row = pair.filter({ hasText: "Durak bir" });
  await expect(pair.first()).toContainText("Durak iki");
  const button = row.locator("button.nav-star");
  await expect(row.locator("a button")).toHaveCount(0);

  // Hidden until the row is hovered, then a real click target.
  await expect(button).toHaveCSS("opacity", "0");
  await row.hover();
  await expect(button).toHaveCSS("opacity", "1");
  const box = await button.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(28);
  expect(box?.height).toBeGreaterThanOrEqual(28);
  await expect(button).toHaveAccessibleName("Yıldızla: Durak bir");
  await expect(button).toHaveAttribute("aria-pressed", "false");

  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toHaveAccessibleName("Yıldızı kaldır: Durak bir");
  await expect(page).toHaveURL("/waiting");
  await expect(pair.first()).toContainText("Durak bir");
  // Stays visible without hover.
  await page.mouse.move(800, 400);
  await expect(button).toHaveCSS("opacity", "1");
  await page.reload();
  await expect(pair.first()).toContainText("Durak bir");

  // Removing the star again keeps the page too.
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(page).toHaveURL("/waiting");

  // Touch size on the narrow layout.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  const mobile = await button.boundingBox();
  expect(mobile?.width).toBeCloseTo(44, 1);
  expect(mobile?.height).toBeCloseTo(44, 1);
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
  const firstSent = await (await send("WAIT-2")).json();
  const firstMove = firstSent.activity.find(
    (entry: { kind: string }) => entry.kind === "moved",
  );
  expect(firstMove).toBeDefined();
  await expect
    .poll(() => Date.now())
    .toBeGreaterThan(Date.parse(firstMove.created_at));
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
