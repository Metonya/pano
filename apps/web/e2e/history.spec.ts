import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "tr"));
});

test("başlık ve body farkları, filtreler, iptal gerekçesi ve geri alma", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "HISTORY", name: "Geçmiş" },
  });
  await request.post("/api/v1/projects/HISTORY/items", {
    data: { title: "Eski başlık", body_md: "Ortak\nEski satır" },
  });
  await request.patch("/api/v1/items/HISTORY-1", {
    data: {
      title: "Yeni başlık",
      body_md: "Ortak\nYeni satır",
      reason: "Kapsam büyüdü",
    },
    headers: { "X-Pano-Actor": "codex" },
  });
  await request.patch("/api/v1/items/HISTORY-1", {
    data: { body_md: "Ortak\nSon satır" },
  });
  for (const [kind, message] of [
    ["decision", "Kapsam onaylandı"],
    ["check", "Unit 18/18 geçti"],
    ["check", "Build failed"],
  ])
    await request.post("/api/v1/items/HISTORY-1/records", {
      data: { kind, message },
    });
  await request.post("/api/v1/items/HISTORY-1/move", {
    data: { status: "in_progress" },
  });
  await page.goto("/projects/HISTORY");
  await page.locator(".board-card").filter({ hasText: "Yeni başlık" }).click();
  await page.getByRole("tab", { name: "Geçmiş" }).click();
  const history = page.getByRole("tabpanel", { name: "Geçmiş" });
  await expect(history.locator(".history-timeline > li")).toHaveCount(7);
  // Moves read as stations: a coloured "from → to" pair.
  await expect(history.locator(".status-flow").first()).toContainText(
    "Backlog",
  );
  await expect(history.locator(".status-flow").first()).toContainText(
    "In Progress",
  );
  // Viewing a card or ticking a criterion is bookkeeping, shown only under Tümü.
  await request.post("/api/v1/items/HISTORY-1/seen", {});
  await page.reload();
  await page.locator(".board-card").filter({ hasText: "Yeni başlık" }).click();
  await page.getByRole("tab", { name: "Geçmiş" }).click();
  await expect(history.locator(".history-timeline > li")).toHaveCount(7);
  await history.getByRole("button", { name: "Tümü", exact: true }).click();
  await expect(history.locator(".history-timeline > li")).toHaveCount(8);
  await history.getByRole("button", { name: "Önemli", exact: true }).click();
  await history
    .getByRole("button", { name: "Değişikliği göster" })
    .last()
    .click();
  await expect(history.locator(".removed")).toContainText([
    "Eski başlık",
    "Eski satır",
  ]);
  await expect(history.locator(".added")).toContainText([
    "Yeni başlık",
    "Yeni satır",
  ]);
  await expect(history).toContainText("Kapsam büyüdü");
  await expect(history.locator(".history-check.passed")).toContainText(
    "✓ Geçti: Unit 18/18 geçti",
  );
  await expect(history.locator(".history-check.failed")).toContainText(
    "✕ Kaldı: Build failed",
  );
  await history.getByRole("button", { name: "Kararlar", exact: true }).click();
  await expect(history.locator(".history-timeline > li")).toHaveCount(1);
  await expect(history).toContainText("Kapsam onaylandı");
  await history.getByRole("button", { name: "Testler", exact: true }).click();
  await expect(history.locator(".history-timeline > li")).toHaveCount(2);
  await history.getByRole("button", { name: "Önemli", exact: true }).click();
  await page
    .getByRole("button", { name: "Diğer işlemler", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "PBI'yı iptal et…" }).click();
  const confirmation = page.getByRole("dialog", {
    name: "PBI iptal edilsin mi?",
  });
  const cancel = confirmation.getByRole("button", { name: "PBI'yı iptal et" });
  await expect(cancel).toBeDisabled();
  await confirmation.getByLabel("İptal gerekçesi").fill("   ");
  await expect(cancel).toBeDisabled();
  await confirmation.getByLabel("İptal gerekçesi").fill("Artık gerekli değil");
  await cancel.click();
  await expect(confirmation).toHaveCount(0);
  await expect(history).toContainText("Artık gerekli değil");
  await expect(history.locator(".status-flow").first()).toContainText(
    "In Progress",
  );
  await expect(history.locator(".status-flow").first()).toContainText("İptal");
  await page
    .getByRole("button", { name: "İptali geri al", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^Durum/ })).toContainText(
    "In Progress",
  );
  await expect(history).toContainText("iptali geri aldı");
});

test("205 kayıtta ilk 50 kayıt açılır ve daha fazla yüklenir", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "HISTPAGE", name: "Sayfalama" },
  });
  await request.post("/api/v1/projects/HISTPAGE/items", {
    data: { title: "Uzun geçmiş" },
  });
  for (let i = 0; i < 205; i++)
    await request.post("/api/v1/items/HISTPAGE-1/records", {
      data: { kind: "note", message: `Kayıt ${i}` },
    });
  await page.goto("/projects/HISTPAGE");
  await page.locator(".board-card").filter({ hasText: "Uzun geçmiş" }).click();
  await page.getByRole("tab", { name: "Geçmiş" }).click();
  const rows = page.locator(".history-timeline > li");
  await expect(rows).toHaveCount(50, { timeout: 15000 });
  await expect(rows.first()).toContainText("Kayıt 204");
  await page.getByRole("button", { name: "Daha fazla", exact: true }).click();
  await expect(rows).toHaveCount(100, { timeout: 15000 });
});
