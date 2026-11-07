import { expect, test } from "@playwright/test";
import { onlyProjects } from "./helpers";

test("agent'ın bildirdiği kullanım veri varken görünür, yokken hiç görünmez", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "USAGE", name: "Kullanım" },
  });
  await request.post("/api/v1/projects/USAGE/items", {
    data: { title: "Sessiz iş", assignee: "codex", criteria: ["Bir"] },
  });
  await page.goto("/projects/USAGE");
  const quiet = page.locator(".board-card").filter({ hasText: "Sessiz iş" });
  await expect(quiet).toBeVisible();
  await expect(quiet.locator(".card-usage")).toHaveCount(0);
  await expect(quiet).not.toContainText("token");
  await quiet.click();
  await expect(page.getByRole("button", { name: /^Durum/ })).toBeVisible();
  await expect(page.locator(".sheet-usage")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator(".board-summary").click();
  await expect(page.locator(".summary-popover dl").first()).toBeVisible();
  await expect(page.locator(".summary-popover")).not.toContainText("token");
  await page.keyboard.press("Escape");

  await request.post("/api/v1/projects/USAGE/items", {
    data: {
      title: "Kullanımlı iş",
      assignee: "claude:gelistirici-cok-uzun-bir-ad",
      criteria: ["Bir", "İki"],
    },
  });
  for (let run = 0; run < 3; run++)
    await request.post("/api/v1/items/USAGE-2/usage", {
      data: {
        model: "gpt-6.1-sol",
        effort: "high",
        input_tokens: 10000,
        output_tokens: 4000,
      },
      headers: { "X-Pano-Actor": "codex" },
    });
  const card = page.locator(".board-card").filter({ hasText: "Kullanımlı iş" });
  await expect(card.locator(".card-usage")).toHaveText(/^42\sB token$/);
  await expect(card.locator(".criteria-progress")).toBeVisible();
  // A long agent name squeezes the tokens first: the progress keeps its room.
  const progress = await card.locator(".criteria-progress").boundingBox();
  expect(progress?.width ?? 0).toBeGreaterThanOrEqual(60);
  const foot = await card.locator(".board-card-foot").boundingBox();
  const usage = await card.locator(".card-usage").boundingBox();
  expect((usage?.x ?? 0) + (usage?.width ?? 0)).toBeLessThanOrEqual(
    (foot?.x ?? 0) + (foot?.width ?? 0) + 1,
  );
  await card.click();
  const line = page.locator(".sheet-usage");
  await expect(line).toContainText(
    /^gpt-6\.1-sol · yüksek · 42\sB token · 3 çalışma/,
  );
  await expect(line).not.toContainText("Codex");
  await expect(line).not.toContainText("context");
  await expect(line).toContainText("Agent'ın bildirdiği değerler");
  await page.keyboard.press("Escape");
  await page.locator(".board-summary").click();
  await expect(page.locator(".summary-popover")).toContainText(
    /Toplam token \(bildirilen\)\s*42\sB/,
  );
  await page.keyboard.press("Escape");

  // The agent's own total wins over input + output, and the largest context shows.
  await request.post("/api/v1/projects/USAGE/items", {
    data: { title: "Context'li iş", assignee: "claude:po" },
  });
  for (const data of [
    {
      model: "claude-opus-5-5",
      effort: "high",
      input_tokens: 1000,
      output_tokens: 1000,
      total_tokens: 100000,
      context_tokens: 45000,
      duration_ms: 240000,
    },
    { total_tokens: 88000, context_tokens: 20000, duration_ms: 180000 },
  ])
    await request.post("/api/v1/items/USAGE-3/usage", {
      data,
      headers: { "X-Pano-Actor": "claude:po" },
    });
  const reported = page
    .locator(".board-card")
    .filter({ hasText: "Context'li iş" });
  await expect(reported.locator(".card-usage")).toHaveText(/^188\sB token$/);
  await reported.click();
  await expect(line).toContainText(
    /^claude-opus-5-5 · yüksek · 188\sB token · 45\sB context · 7 dk\.? · 2 çalışma/,
  );
  await expect(line).not.toContainText("Claude");
  await expect(line).not.toContainText("PO");
  await expect(line).toContainText("Agent'ın bildirdiği değerler");
  await page.keyboard.press("Escape");
  await page.locator(".board-summary").click();
  await expect(page.locator(".summary-popover")).toContainText(
    /Toplam token \(bildirilen\)\s*230\sB/,
  );
});

test("board oluşturma, kriter, taşıma, canlı güncelleme ve filtre", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "BOARD", name: "Board test" },
  });
  await page.goto("/projects/BOARD");
  await page.getByRole("button", { name: "Yeni PBI" }).click();
  // Not by label: the sidebar's star buttons carry other projects' names.
  await page.getByRole("textbox", { name: "Başlık" }).fill("Board işi");
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
  // The drag sensor has no reliable observable settling state before release.
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(
    page.locator(".board-column").filter({ hasText: "Test" }),
  ).toContainText("Board işi");
  // The card moves at once; a later move must not overtake this request.
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/v1/items/BOARD-1")).json()).status,
    )
    .toBe("test");
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
  // The keyboard sensor exposes no observable ready state, so this wait stays.
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
  await expect
    .poll(async () => (await field.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(220);
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

test("PBI başlığı yerinde düzenlenir, panelde ve kartta güncel kalır", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "TITLE", name: "Başlık" },
  });
  await request.post("/api/v1/projects/TITLE/items", {
    data: { title: "Eski başlık" },
  });
  await page.goto("/projects/TITLE");
  const cards = page.locator(".board-card");
  await cards.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Eski başlık");
  const open = dialog.getByRole("button", { name: "Başlığı düzenle" });
  const field = dialog.getByRole("textbox", { name: "Başlığı düzenle" });

  // Same size and weight as the title; the layout stays where it was.
  await expect(open).toHaveCSS("font-size", "24px");
  await expect(open).toHaveCSS("font-weight", "700");
  // The opening animation scales the sheet: measure after it has settled.
  await dialog.locator(".sheet-properties").waitFor();
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished)),
  );
  const shown = await open.boundingBox();
  const next = await dialog.locator(".sheet-properties").boundingBox();
  await open.click();
  await expect(field).toBeFocused();
  await expect(field).toHaveCSS("font-size", "24px");
  await expect(field).toHaveCSS("font-weight", "700");
  expect(await field.boundingBox()).toEqual(shown);
  expect(await dialog.locator(".sheet-properties").boundingBox()).toEqual(next);

  // Esc only leaves the editor: nothing is saved and the panel stays open.
  await field.fill("Vazgeçilen başlık");
  await field.press("Escape");
  await expect(field).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(open).toBeFocused();
  await expect(dialog.getByRole("heading", { level: 2 })).toContainText(
    "Eski başlık",
  );
  await expect(cards).toContainText("Eski başlık");
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/v1/items/TITLE-1")).json()).title,
    )
    .toBe("Eski başlık");

  // An empty title is never sent; the old text returns.
  await open.press("Enter");
  await expect(field).toBeFocused();
  await field.fill("   ");
  await field.press("Enter");
  await expect(field).toHaveCount(0);
  await expect(open).toContainText("Eski başlık");

  // Enter saves; the panel and the card both show the new title at once.
  await open.click();
  await field.fill("Yeni başlık");
  await field.press("Enter");
  await expect(field).toHaveCount(0);
  await expect(open).toContainText("Yeni başlık");
  await expect(dialog).toHaveAccessibleName("Yeni başlık");
  await expect(cards).toContainText("Yeni başlık");
  await expect(open).toBeFocused();

  // Losing focus saves too, and a long title grows the field without clipping.
  await open.click();
  const long = "Çok uzun bir başlık ".repeat(12).trim();
  await field.fill(long);
  expect(
    await field.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
  expect((await field.boundingBox())?.height).toBeGreaterThan(60);
  await dialog.getByRole("tab", { name: "Geçmiş" }).focus();
  await expect(cards).toContainText("Çok uzun bir başlık");
  await open.click();
  await field.fill("Yeni başlık");
  await field.press("Enter");
  await expect(cards).not.toContainText("Çok uzun");

  // Once saved nothing is left to lose, so Esc closes without asking.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await cards.click();
  await expect(open).toContainText("Yeni başlık");

  // The history shows both the old and the new text.
  await dialog.getByRole("tab", { name: "Geçmiş" }).click();
  const titleEdit = dialog
    .locator(".history-entry")
    .filter({ hasText: "Eski başlık" });
  await expect(titleEdit.locator(".history-diff-line.removed")).toContainText(
    "Eski başlık",
  );
  await expect(titleEdit.locator(".history-diff-line.added")).toContainText(
    "Yeni başlık",
  );
});

test("kaydedilemeyen başlık yazıldığı gibi kalır ve kapatırken sorulur", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "TITLEFAIL", name: "Başlık hatası" },
  });
  await request.post("/api/v1/projects/TITLEFAIL/items", {
    data: { title: "Sağlam başlık" },
  });
  await page.goto("/projects/TITLEFAIL");
  const card = page.locator(".board-card");
  await card.click();
  const dialog = page.getByRole("dialog");
  await page.route("**/api/v1/items/TITLEFAIL-1", (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 500,
          body: "{}",
          contentType: "application/json",
        })
      : route.continue(),
  );
  await dialog.getByRole("button", { name: "Başlığı düzenle" }).click();
  const field = dialog.getByRole("textbox", { name: "Başlığı düzenle" });
  await field.fill("Yazılmamış başlık");
  await field.press("Enter");
  await expect(dialog.getByRole("alert")).toContainText("İşlem tamamlanamadı");
  await expect(field).toHaveValue("Yazılmamış başlık");
  await expect(card).toContainText("Sağlam başlık");
  await dialog.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Kaydetmeden kapat" }),
  ).toBeVisible();
});

test("iptal edilmiş PBI'nın başlığı da düzenlenir", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "TITLECAN", name: "İptal başlığı" },
  });
  await request.post("/api/v1/projects/TITLECAN/items", {
    data: { title: "İptal işi" },
  });
  await request.post("/api/v1/items/TITLECAN-1/move", {
    data: { status: "cancelled", reason: "Gerek kalmadı" },
  });
  await page.goto("/projects/TITLECAN");
  await page.getByRole("button", { name: "Filtre", exact: true }).click();
  await page.getByRole("menuitemcheckbox").click();
  await page.keyboard.press("Escape");
  await page.locator(".cancelled-list button").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Başlığı düzenle" }).click();
  await dialog
    .getByRole("textbox", { name: "Başlığı düzenle" })
    .fill("İptal işi, yeni ad");
  await page.keyboard.press("Enter");
  await expect(page.locator(".cancelled-list")).toContainText(
    "İptal işi, yeni ad",
  );
});

test("logo ve favicon aynı board ikonunu kullanır", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const bars = page.locator(".sidebar .brand-icon svg rect");
  await expect(bars).toHaveCount(3);
  await expect(page.locator(".sidebar .brand-icon")).toHaveCSS(
    "border-radius",
    "9px",
  );
  const href = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(href).toBe("/favicon.svg");
  const favicon = await request.get(href ?? "");
  expect(favicon.headers()["content-type"]).toContain("image/svg+xml");
  const svg = await favicon.text();
  for (const bar of await bars.evaluateAll((rects) =>
    rects.map((r) =>
      ["x", "y", "width", "height", "rx"]
        .map((name) => `${name}="${r.getAttribute(name)}"`)
        .join(" "),
    ),
  ))
    expect(svg).toContain(bar);
});

test("atanan listesi araç düzeyinde: üç Claude rolü tek satır", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "tr"));
  await onlyProjects(page, "ROLES");
  await request.post("/api/v1/projects", {
    data: { key: "ROLES", name: "Roller" },
  });
  for (const assignee of ["claude:po", "claude:kimlik", "claude:kart", "codex"])
    await request.post("/api/v1/projects/ROLES/items", {
      data: { title: `İş ${assignee}`, assignee },
    });
  await page.goto("/projects/ROLES");
  const card = page
    .locator(".board-card")
    .filter({ hasText: "İş claude:kimlik" });
  // The card shows the tool; the full identity stays in its title.
  await expect(card.locator(".assignee")).toHaveText("Claude");
  await expect(card.locator(".assignee svg")).toHaveCount(1);
  await expect(card.locator(".assignee")).toHaveAttribute(
    "title",
    "claude:kimlik",
  );

  await page.getByRole("button", { name: "Filtre", exact: true }).click();
  await expect(page.getByRole("menuitemradio", { name: "Claude" })).toHaveCount(
    1,
  );
  await page.getByRole("menuitemradio", { name: "Claude" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".board-card")).toHaveCount(3);
  await expect(
    page.locator(".board-card").filter({ hasText: "İş codex" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Filtre: 1" }).click();
  await page.getByRole("menuitemradio", { name: "Tümü" }).first().click();
  await page.keyboard.press("Escape");

  await card.click();
  const assignee = page.getByRole("button", {
    name: "Atanan: Claude · Kimlik",
  });
  await expect(assignee).toBeVisible();
  await expect(page.locator(".sheet-assignee-role")).toHaveText("Kimlik");
  await assignee.click();
  await expect(page.getByRole("menuitemradio", { name: "Claude" })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("menuitemradio", { name: "Claude" }),
  ).toBeChecked();
  // The menu sizes its icons, but a logo stays inside the avatar circle.
  await expect(
    page
      .getByRole("menuitemradio", { name: "Claude" })
      .locator(".assignee-avatar svg"),
  ).toHaveCSS("width", "12px");
  await expect(page.getByRole("menuitemradio", { name: "Mert" })).toHaveCount(
    1,
  );
  await expect(page.getByRole("menuitemradio", { name: "Cursor" })).toHaveCount(
    1,
  );
  // The same tool again keeps the role and sends nothing.
  let assigned = 0;
  page.on("request", (r) => {
    if (r.url().includes("/assign")) assigned++;
  });
  await page.getByRole("menuitemradio", { name: "Claude" }).click();
  await expect(assignee).toBeVisible();
  expect(assigned).toBe(0);
  // Another tool from the menu is stored as the tool name.
  await assignee.click();
  await page.getByRole("menuitemradio", { name: "Cursor" }).click();
  await expect(
    page.getByRole("button", { name: "Atanan: Cursor" }),
  ).toBeVisible();
  const saved = await (await request.get("/api/v1/items/ROLES-2")).json();
  expect(saved.assignee).toBe("cursor");
  await page.keyboard.press("Escape");

  // In the sidebar every role of a tool is one row.
  await request.post("/api/v1/items/ROLES-1/move", {
    data: { status: "in_progress" },
  });
  await request.post("/api/v1/items/ROLES-3/move", {
    data: { status: "in_progress" },
  });
  await page.reload();
  await expect(page.locator(".agent-row")).toHaveCount(1);
  await expect(page.locator(".agent-row")).toContainText("Claude");
});
