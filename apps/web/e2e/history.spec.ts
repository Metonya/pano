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

test("senaryo ve kriter kayıtları ne değiştiğini metniyle söyler", async ({
  page,
  request,
}) => {
  const headers = { "X-Pano-Actor": "mert" };
  await request.post("/api/v1/projects", {
    data: { key: "HISTCHILD", name: "İçerik" },
  });
  await request.post("/api/v1/projects/HISTCHILD/items", {
    data: { title: "İçerik geçmişi" },
  });
  const url = "/api/v1/items/HISTCHILD-1";
  const scenario = await (
    await request.post(`${url}/scenarios`, {
      data: { steps_md: "Sepeti aç", expected_md: "Boş", author: "mert" },
      headers,
    })
  ).json();
  await request.patch(`${url}/scenarios/${scenario.id}`, {
    data: { expected_md: "Sepet boş görünür" },
    headers,
  });
  await request.patch(`${url}/scenarios/${scenario.id}`, {
    data: { result: "failed" },
    headers,
  });
  await request.delete(`${url}/scenarios/${scenario.id}`, { headers });
  const criterion = await (
    await request.post(`${url}/criteria`, {
      data: { text: "Eski kriter" },
      headers,
    })
  ).json();
  await request.patch(`${url}/criteria/${criterion.id}`, {
    data: { text: "Yeni kriter" },
    headers,
  });
  await request.delete(`${url}/criteria/${criterion.id}`, { headers });
  await page.goto("/projects/HISTCHILD");
  await page
    .locator(".board-card")
    .filter({ hasText: "İçerik geçmişi" })
    .click();
  await page.getByRole("tab", { name: "Geçmiş" }).click();
  const history = page.getByRole("tabpanel", { name: "Geçmiş" });
  const rows = history.locator(".history-timeline > li");
  // Önemli: the result change alone stays out, the content changes stay in.
  await expect(history).toContainText("Mert senaryoyu sildi: Sepeti aç");
  await expect(history).not.toContainText("Kaldı işaretledi");
  await expect(rows).toHaveCount(7);
  const removed = rows.filter({ hasText: "senaryoyu sildi" });
  await expect(removed.locator(".removed del")).toHaveText([
    "Sepeti aç",
    "Beklenen: Sepet boş görünür",
  ]);
  const edited = rows.filter({ hasText: "senaryoyu düzenledi" });
  await expect(edited.locator(".removed")).toContainText("Boş");
  await expect(edited.locator(".added")).toContainText("Sepet boş görünür");
  const criterionEdit = rows.filter({ hasText: "kriteri düzenledi" });
  await expect(criterionEdit.locator(".removed")).toContainText("Eski kriter");
  await expect(criterionEdit.locator(".added")).toContainText("Yeni kriter");
  await expect(history).toContainText("Mert kriteri sildi: Yeni kriter");
  await expect(history).not.toContainText("Neden");
  await expect(history).not.toContainText("scenario_");
  await expect(history).not.toContainText("criterion_");
  await history.getByRole("button", { name: "Testler", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(
    "Mert senaryoyu Kaldı işaretledi: Sepeti aç",
  );
  await history.getByRole("button", { name: "Tümü", exact: true }).click();
  await expect(history).not.toContainText("scenario_");
  await expect(history).not.toContainText("Neden");
});

test("kullanım kaydı Tümü'nde görünür, Önemli ve Testler'de görünmez", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "HISTUSE", name: "Kullanım" },
  });
  await request.post("/api/v1/projects/HISTUSE/items", {
    data: { title: "Kullanımlı iş" },
  });
  await request.post("/api/v1/items/HISTUSE-1/usage", {
    data: {
      model: "gpt-6.1-sol",
      effort: "high",
      input_tokens: 12000,
      output_tokens: 3000,
      duration_ms: 120000,
      note: "İlk tur",
    },
    headers: { "X-Pano-Actor": "codex" },
  });
  await page.goto("/projects/HISTUSE");
  await page
    .locator(".board-card")
    .filter({ hasText: "Kullanımlı iş" })
    .click();
  await page.getByRole("tab", { name: "Geçmiş" }).click();
  const history = page.getByRole("tabpanel", { name: "Geçmiş" });
  await expect(history).not.toContainText("çalışmayı kaydetti");
  await history.getByRole("button", { name: "Testler", exact: true }).click();
  await expect(history).not.toContainText("çalışmayı kaydetti");
  await history.getByRole("button", { name: "Tümü", exact: true }).click();
  const row = history
    .locator(".history-timeline > li")
    .filter({ hasText: "Codex çalışmayı kaydetti" });
  await expect(row.locator(".history-usage")).toHaveText(
    /^gpt-6\.1-sol · high · 12\sB giriş · 3\sB çıkış · 2 dk\.?$/,
  );
  await expect(row).toContainText("İlk tur");
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

test("yüklenirken gelen canlı olay Daha fazla tıklamasını iptal etmez", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "HISTLIVE", name: "Canlı geçmiş" },
  });
  for (const title of ["Uzun geçmiş", "Başka iş"])
    await request.post("/api/v1/projects/HISTLIVE/items", { data: { title } });
  for (let i = 0; i < 55; i++)
    await request.post("/api/v1/items/HISTLIVE-1/records", {
      data: { kind: "note", message: `Kayıt ${i}` },
    });
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/activity?limit=50&offset=50*", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/projects/HISTLIVE");
  await page.locator(".board-card").filter({ hasText: "Uzun geçmiş" }).click();
  await page.getByRole("tab", { name: "Geçmiş" }).click();
  const rows = page.locator(".history-timeline > li");
  await expect(rows).toHaveCount(50);
  const nextPage = page.waitForRequest("**/activity?limit=50&offset=50*");
  await page.getByRole("button", { name: "Daha fazla", exact: true }).click();
  await nextPage;
  // Any write produces an event; wait until the page has refreshed because of it.
  const refreshed = page.waitForResponse("**/api/v1/projects?*");
  await request.post("/api/v1/items/HISTLIVE-2/records", {
    data: { kind: "note", message: "Başka kayıt" },
  });
  await refreshed;
  release();
  await expect(rows.filter({ hasText: "Kayıt 0" })).toHaveCount(1);
});
