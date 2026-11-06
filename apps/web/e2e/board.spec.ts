import { expect, test } from "@playwright/test";

test("board oluşturma, kriter, taşıma, canlı güncelleme ve filtre", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "BOARD", name: "Board test" },
  });
  await page.goto("/projects/BOARD");
  await page.getByRole("button", { name: "Yeni PBI" }).click();
  await page.getByLabel("Başlık").fill("Board işi");
  await page.getByRole("button", { name: "Oluştur" }).click();
  const card = page.locator(".board-card").filter({ hasText: "Board işi" });
  await card.click();
  await page.getByLabel("Yeni kriter").fill("Kontrol et");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Kontrol et" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kriteri düzenle: Kontrol et" })
    .click();
  await page
    .getByLabel("Kriteri düzenle", { exact: true })
    .fill("Güncel kriter");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await page
    .getByRole("checkbox", { name: "Güncel kriter", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Kriteri sil: Güncel kriter" })
    .click();
  // Deleting asks inside the row first; cancelling keeps the criterion.
  const confirm = page.getByRole("group", { name: "Bu kriter silinsin mi?" });
  await expect(confirm.getByRole("button", { name: "Vazgeç" })).toBeFocused();
  await confirm.getByRole("button", { name: "Vazgeç" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Güncel kriter", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kriteri sil: Güncel kriter" })
    .click();
  await confirm.getByRole("button", { name: "Sil", exact: true }).click();
  await expect(page.getByLabel("Güncel kriter")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(card).not.toContainText("1/1");
  await expect(card).toBeFocused();
  // Move in small steps like a real pointer so dnd-kit can track the target.
  const handleBox = await card.boundingBox();
  const columnBox = await page
    .locator(".board-column")
    .filter({ hasText: "Test" })
    .boundingBox();
  if (!handleBox || !columnBox) throw new Error("Board is not visible");
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 20, handleBox.y + 20, { steps: 5 });
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 100, {
    steps: 15,
  });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(
    page.locator(".board-column").filter({ hasText: "Test" }),
  ).toContainText("Board işi");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toHaveCSS("opacity", "1");
  expect(
    await page
      .locator(".board-column-scroll")
      .evaluateAll((columns) =>
        columns.every((column) => column.scrollWidth <= column.clientWidth),
      ),
  ).toBe(true);
  await request.post("/api/v1/items/BOARD-1/move", {
    data: { status: "test" },
  });
  await expect(
    page.locator(".board-column").filter({ hasText: "Test" }),
  ).toContainText("Board işi");
  await request.post("/api/v1/items/BOARD-1/move", {
    data: { status: "done" },
  });
  await expect(
    page.locator(".board-column").filter({ hasText: "Done" }),
  ).toContainText("Board işi");
  await expect(card.getByRole("img", { name: "Görülmedi" })).toBeVisible();
  await card.click();
  await page.keyboard.press("Escape");
  await expect(card.getByRole("img", { name: "Görülmedi" })).toHaveCount(0);
  await request.post("/api/v1/projects/BOARD/items", {
    data: { title: "Başka iş", assignee: "mert" },
  });
  await request.post("/api/v1/items/BOARD-1/assign", {
    data: { assignee: "codex" },
  });
  await page.getByRole("button", { name: "Filtre", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Codex" }).click();
  // The menu stays open so several filters can be set together.
  await expect(
    page.getByRole("menuitemradio", { name: "Yüksek" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Filtre: 1" })).toBeVisible();
  await expect(card).toBeVisible();
  await expect(
    page.locator(".board-card").filter({ hasText: "Başka iş" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Filtre: 1" }).click();
  await page.getByRole("menuitem", { name: "Filtreyi temizle" }).click();
  await expect(
    page.locator(".board-card").filter({ hasText: "Başka iş" }),
  ).toBeVisible();
  // Search opens from its icon and closes again with Esc.
  await page.getByRole("button", { name: "Ara", exact: true }).click();
  await page.getByRole("textbox", { name: "Ara" }).fill("Başka");
  await expect(card).toHaveCount(0);
  await page.getByRole("textbox", { name: "Ara" }).press("Escape");
  await expect(page.getByRole("textbox", { name: "Ara" })).toHaveCount(0);
  await expect(card).toBeVisible();
});

test("klavyeyle kolonlar arasında taşınan kart yenilemede kalır", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "KEYBOARD", name: "Klavye" },
  });
  await request.post("/api/v1/projects/KEYBOARD/items", {
    data: { title: "Klavye işi" },
  });
  await page.goto("/projects/KEYBOARD");
  const card = page.locator(".board-card").filter({ hasText: "Klavye işi" });
  const handle = card;
  await handle.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/v1/items/KEYBOARD-1")).json()).status,
    )
    .toBe("in_progress");
  await page.reload();
  await expect(
    page.locator(".board-column").filter({ hasText: "In Progress" }),
  ).toContainText("Klavye işi");
});

test("Test kolonu kapalı projede üç kolon gösterilir", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "NOTEST", name: "Testsiz", test_column: false },
  });
  await request.post("/api/v1/projects/NOTEST/items", {
    data: { title: "Bir iş" },
  });
  await page.goto("/projects/NOTEST");
  await expect(page.locator(".board-column")).toHaveCount(3);
  await expect(
    page.locator(".board-column h2").filter({ hasText: /^Test/ }),
  ).toHaveCount(0);
});

test("kriter işareti hemen görünür ve istek başarısızsa geri alınır", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "CRITERIA", name: "Kriter" },
  });
  await request.post("/api/v1/projects/CRITERIA/items", {
    data: { title: "Kontrol", criteria: ["Ölçüt"] },
  });
  let rejectRequest: (() => void) | undefined;
  await page.route("**/api/v1/items/CRITERIA-1/criteria/*", async (route) => {
    await new Promise<void>((resolve) => {
      rejectRequest = resolve;
    });
    await route.fulfill({
      status: 500,
      body: "{}",
      contentType: "application/json",
    });
  });
  await page.goto("/projects/CRITERIA");
  const card = page.locator(".board-card").filter({ hasText: "Kontrol" });
  await card.click();
  const checkbox = page.getByRole("checkbox", { name: "Ölçüt" });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expect(card).toContainText("1/1");
  await expect.poll(() => !!rejectRequest).toBe(true);
  rejectRequest?.();
  await expect(checkbox).not.toBeChecked();
  await expect(card).toContainText("0/1");
  await expect(page.getByRole("alert")).toContainText("İşlem tamamlanamadı");
});

test("375 pikselde board taşmaz", async ({ page, request }) => {
  await request.post("/api/v1/projects", {
    data: { key: "MOBILE", name: "Mobil" },
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/projects/MOBILE");
  await expect(page.getByRole("button", { name: "Yeni PBI" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("masaüstünde sayfa kaymaz, yalnız kolon kayar; boş kolon tüm yüksekliği kaplar", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "SCROLL", name: "Kaydırma" },
  });
  for (let i = 1; i <= 16; i++)
    await request.post("/api/v1/projects/SCROLL/items", {
      data: { title: `Kaydırma işi ${i}` },
    });
  await request.post("/api/v1/items/SCROLL-1/move", {
    data: { status: "cancelled", reason: "Gerek kalmadı" },
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects/SCROLL");
  const backlog = page.locator(".board-column").filter({ hasText: "Backlog" });
  const scroller = backlog.locator(".board-column-scroll");
  await expect(backlog.locator(".board-card").first()).toBeVisible();
  const pageFits = () =>
    page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    );
  expect(await pageFits()).toBe(true);
  expect(
    await scroller.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);

  const toolbarTop = await page.locator(".toolbar").boundingBox();
  const summaryTop = await page.locator(".board-summary").boundingBox();
  const box = await scroller.boundingBox();
  if (!box) throw new Error("Column is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 400);
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.locator(".toolbar").boundingBox()).toEqual(toolbarTop);
  expect(await page.locator(".board-summary").boundingBox()).toEqual(
    summaryTop,
  );

  // Columns reach the bottom of the screen; an empty one is a full drop area.
  const empty = await page
    .locator(".board-column")
    .filter({ hasText: "In Progress" })
    .boundingBox();
  const full = await backlog.boundingBox();
  expect(empty?.height).toBe(full?.height);
  expect((full?.y ?? 0) + (full?.height ?? 0)).toBe(900);

  // The last card keeps some room under it.
  await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const last = await backlog.locator(".board-card").last().boundingBox();
  expect(900 - ((last?.y ?? 0) + (last?.height ?? 0))).toBeGreaterThanOrEqual(
    12,
  );

  // The cancelled list has its own height limit and leaves the board in place.
  await page.getByRole("button", { name: "Filtre", exact: true }).click();
  await page.getByRole("menuitemcheckbox").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".cancelled-list")).toBeVisible();
  expect(await pageFits()).toBe(true);
  expect(
    (await page.locator(".cancelled-list").boundingBox())?.height,
  ).toBeLessThanOrEqual(168);
});

test("mobilde sayfa normal kayar ve kolon kendi içinde kaymaz", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "SCROLLM", name: "Mobil kaydırma" },
  });
  for (let i = 1; i <= 12; i++)
    await request.post("/api/v1/projects/SCROLLM/items", {
      data: { title: `Mobil iş ${i}` },
    });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/projects/SCROLLM");
  await expect(page.locator(".board-card").first()).toBeVisible();
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await expect(page.locator(".toolbar")).toBeInViewport();
  const scroller = page.locator(
    ".board-column.mobile-active .board-column-scroll",
  );
  expect(await scroller.evaluate((el) => getComputedStyle(el).overflowY)).toBe(
    "visible",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("açıklama alanı panel genişliğinde; iptal etiketi ile alan arasında boşluk var", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "FORM", name: "Form" },
  });
  await request.post("/api/v1/projects/FORM/items", {
    data: { title: "Form işi", body_md: "Eski açıklama" },
  });
  await page.goto("/projects/FORM");
  await page.locator(".board-card").filter({ hasText: "Form işi" }).click();
  const sheetBody = page.locator(".sheet-body");
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Açıklama" });
  const [fieldBox, bodyBox] = [
    await field.boundingBox(),
    await sheetBody.boundingBox(),
  ];
  // Body padding is 32px on each side.
  expect(fieldBox?.width).toBeGreaterThanOrEqual((bodyBox?.width ?? 0) - 80);
  expect(fieldBox?.height).toBeGreaterThanOrEqual(220);
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();

  await page.getByRole("button", { name: "Diğer işlemler" }).click();
  await page.getByRole("menuitem").click();
  const reason = page.getByRole("dialog").last().getByRole("textbox");
  await expect(reason).toBeFocused();
  expect(
    await reason.evaluate((input) => {
      const range = document.createRange();
      const label = input.closest("label");
      if (!label?.firstChild) return 0;
      range.selectNode(label.firstChild);
      return (
        input.getBoundingClientRect().top - range.getBoundingClientRect().bottom
      );
    }),
  ).toBeGreaterThanOrEqual(8);
});
