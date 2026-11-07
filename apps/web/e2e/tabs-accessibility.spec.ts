import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "tr"));
});

test("ayar sekmeleri ok tuşlarıyla dolaşılır ve panellerine bağlıdır", async ({
  page,
}) => {
  await page.goto("/settings");
  const dialog = page.getByRole("dialog");
  const tabs = dialog.getByRole("tab");
  const general = dialog.getByRole("tab", { name: "Genel" });
  const appearance = dialog.getByRole("tab", { name: "Görünüm" });
  await general.focus();
  await expect(general).toHaveAttribute("tabindex", "0");
  await expect(appearance).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowRight");
  await expect(appearance).toBeFocused();
  await expect(appearance).toHaveAttribute("aria-selected", "true");
  const tabId = await appearance.getAttribute("id");
  const panelId = await appearance.getAttribute("aria-controls");
  const panel = dialog.getByRole("tabpanel", { name: "Görünüm" });
  expect(panelId).toBeTruthy();
  expect(tabId).toBeTruthy();
  await expect(panel).toHaveAttribute("id", panelId ?? "");
  await expect(panel).toHaveAttribute("aria-labelledby", tabId ?? "");
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("radio", { checked: true })).toBeFocused();
  await appearance.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(general).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.last()).toBeFocused();
});

test("detay sekmeleri notu korur ve ilgili panelleri bildirir", async ({
  page,
  request,
}) => {
  const post = (path: string, data: object) =>
    request.post(`/api/v1${path}`, {
      data,
      headers: { "X-Pano-Actor": "codex" },
    });
  expect(
    (await post("/projects", { key: "TABTEST", name: "Sekme testi" })).ok(),
  ).toBeTruthy();
  await post("/projects/TABTEST/items", {
    title: "Kontrol",
    assignee: "codex",
  });
  await request.patch("/api/v1/items/TABTEST-1", {
    data: { status: "test", assignee: "mert" },
    headers: { "X-Pano-Actor": "codex" },
  });
  await page.goto("/projects/TABTEST");
  await page.locator(".board-card").filter({ hasText: "Kontrol" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Geri gönder", exact: true })
    .click();
  const note = dialog.getByRole("textbox", { name: "Geri gönderme notu" });
  await note.fill("Kaydedilmemiş not");
  const detail = dialog.getByRole("tab", { name: "Detay" });
  const history = dialog.getByRole("tab", { name: "Geçmiş" });
  await detail.focus();
  await page.keyboard.press("ArrowRight");
  await expect(history).toBeFocused();
  const panel = dialog.getByRole("tabpanel", { name: "Geçmiş" });
  await expect(panel).toHaveAttribute(
    "id",
    (await history.getAttribute("aria-controls")) ?? "",
  );
  await expect(panel).toHaveAttribute(
    "aria-labelledby",
    (await history.getAttribute("id")) ?? "",
  );
  await page.keyboard.press("ArrowLeft");
  await expect(detail).toBeFocused();
  await expect(dialog.getByRole("tabpanel", { name: "Detay" })).toBeVisible();
  await expect(note).toHaveValue("Kaydedilmemiş not");
});

test("mobil board statü seçicisi klavyeyle çalışan basılı düğmelerdir", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await request.post("/api/v1/projects", {
    data: { key: "MOBTAB", name: "Mobil sekme" },
  });
  await request.post("/api/v1/projects/MOBTAB/items", {
    data: { title: "Mobil iş" },
  });
  await page.goto("/projects/MOBTAB");
  const group = page.getByRole("group", { name: "Durum" });
  const backlog = group.getByRole("button", { name: /Backlog/ });
  const progress = group.getByRole("button", { name: /In Progress/ });
  await expect(backlog).toHaveAttribute("aria-pressed", "true");
  await backlog.focus();
  await page.keyboard.press("Tab");
  await expect(progress).toBeFocused();
  await page.keyboard.press("Space");
  await expect(progress).toHaveAttribute("aria-pressed", "true");
  await expect(backlog).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".board-column.mobile-active")).toHaveAttribute(
    "aria-label",
    "In Progress",
  );
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(page.locator(".board-column")).toHaveCount(4);
  await expect(page.locator(".board-column").first()).toBeVisible();
});
