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
  await card.getByRole("button", { name: "Board işi" }).click();
  await page.getByLabel("Yeni kriter").fill("Kontrol et");
  await page.getByRole("button", { name: "Ekle", exact: true }).click();
  await expect(page.getByLabel("Kontrol et")).toBeVisible();
  await page.getByLabel("Kontrol et").check();
  await page.keyboard.press("Escape");
  await expect(card).toContainText("1/1");
  await expect(card.getByRole("button", { name: "Board işi" })).toBeFocused();
  // Move in small steps like a real pointer so dnd-kit can track the target.
  const handleBox = await card
    .getByRole("button", { name: /Kartı taşı/ })
    .boundingBox();
  const columnBox = await page
    .locator(".board-column")
    .filter({ hasText: "In Progress" })
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
    page.locator(".board-column").filter({ hasText: "In Progress" }),
  ).toContainText("Board işi");
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
  await card.getByRole("button", { name: "Board işi" }).click();
  await page.keyboard.press("Escape");
  await expect(card.getByRole("img", { name: "Görülmedi" })).toHaveCount(0);
  await request.post("/api/v1/projects/BOARD/items", {
    data: { title: "Başka iş", assignee: "mert" },
  });
  await request.post("/api/v1/items/BOARD-1/assign", {
    data: { assignee: "codex" },
  });
  await page.getByText("Filtre", { exact: true }).click();
  await expect(
    page.getByLabel("Atanan").locator('option[value="codex"]'),
  ).toHaveCount(1);
  await page.getByLabel("Atanan").selectOption("codex");
  await expect(card).toBeVisible();
  await expect(page.getByRole("button", { name: "Başka iş" })).toHaveCount(0);
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
  const handle = card.getByRole("button", { name: /Kartı taşı/ });
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
  await card.getByRole("button", { name: "Kontrol" }).click();
  const checkbox = page.getByLabel("Ölçüt");
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
