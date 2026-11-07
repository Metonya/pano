import { expect, test } from "@playwright/test";

test("insan testi geri gönderme ve onay", async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "tr"));
  const post = (path: string, data: object, actor = "codex") =>
    request.post(`/api/v1${path}`, {
      data,
      headers: { "X-Pano-Actor": actor },
    });
  expect(
    (await post("/projects", { key: "HUMAN", name: "İnsan testi" })).ok(),
  ).toBeTruthy();
  await post("/projects/HUMAN/items", {
    title: "Test edilecek",
    assignee: "codex",
  });
  await post("/items/HUMAN-1/scenarios", {
    steps_md: "Sayfayı aç",
    expected_md: "Görünür",
    author: "codex",
  });
  await request.patch("/api/v1/items/HUMAN-1", {
    data: {
      status: "test",
      assignee: "mert",
      what_changed_md: "Ekran değişti",
      how_to_test_md: "Sayfayı aç",
    },
    headers: { "X-Pano-Actor": "codex" },
  });
  await page.goto("/waiting");
  await expect(page.getByText("HUMAN-1")).toBeVisible();
  await page.getByRole("link", { name: /Test edilecek/ }).click();
  await expect(page.getByLabel("Adımlar", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "AI'ın kendi testleri" }),
  ).toHaveCount(0);
  // The card shows the expected text alone; only screen readers get the label.
  const firstCard = page.locator(".test-scenario").first();
  const expectedRow = firstCard.locator(".test-expected");
  await expect(expectedRow).toContainText("Görünür");
  await expect(expectedRow.locator(".sr-only")).toHaveText("Beklenen sonuç:");
  const label = await expectedRow.locator(".sr-only").boundingBox();
  expect(label?.width).toBeLessThanOrEqual(1);
  await expect(expectedRow.locator(".markdown")).toHaveCSS("font-size", "13px");
  const stepsBox = await firstCard
    .getByText("Sayfayı aç", { exact: true })
    .boundingBox();
  const expectedBox = await expectedRow.getByText("Görünür").boundingBox();
  expect(expectedBox?.y ?? 0).toBeGreaterThanOrEqual(
    (stepsBox?.y ?? 0) + (stepsBox?.height ?? 0),
  );
  await page.getByRole("button", { name: "Senaryo ekle", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ekle", exact: true }).first(),
  ).toBeDisabled();
  await page.getByLabel("Adımlar", { exact: true }).fill("İkinci senaryo");
  await page.getByLabel("Beklenen sonuç", { exact: true }).fill("İkinci sonuç");
  await page
    .locator(".test-panel")
    .getByRole("button", { name: "Ekle", exact: true })
    .click();
  // The saved card can appear just before the form closes, with the same text.
  await expect(
    page.locator(".test-scenario p", { hasText: "İkinci senaryo" }),
  ).toBeVisible();
  await expect(page.getByLabel("Adımlar", { exact: true })).toHaveCount(0);
  await page
    .getByRole("group", { name: /1: Sayfayı aç/ })
    .getByRole("button", { name: "Kaldı" })
    .click();
  // A failed scenario asks for its own note; the composer stays closed.
  const sendBackForm = page.getByRole("form", {
    name: "Geri gönder",
    exact: true,
  });
  const failedCard = page
    .locator(".test-scenario")
    .filter({ hasText: "Sayfayı aç" });
  const scenarioNote = failedCard.getByLabel("Senaryo notu");
  await expect(scenarioNote).toBeVisible();
  await expect(scenarioNote).toHaveAttribute("placeholder", "Ne oldu?");
  await expect(sendBackForm).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Geri ata" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Geri gönder", exact: true }),
  ).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Onayla" })).toBeDisabled();
  await expect(page.locator(".test-actions .test-primary")).toHaveText(
    "Geri gönder",
  );
  await expect(page.locator(".test-actions")).toContainText("Kalan senaryolar");
  // Without a scenario note, the general note is required.
  await page.locator(".test-actions .test-primary").click();
  await expect(sendBackForm).toBeVisible();
  expect(
    await page
      .locator(".sheet-body")
      .evaluate((body) => body.scrollWidth <= body.clientWidth),
  ).toBe(true);
  const submit = sendBackForm.getByRole("button", {
    name: "Geri gönder",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await expect(sendBackForm).toContainText("Zorunlu.");
  await sendBackForm.getByRole("button", { name: "Vazgeç" }).click();
  // Leaving Failed hides the note; returning brings it back.
  await scenarioNote.fill("Başlık kayık");
  await failedCard.getByRole("button", { name: "Kaldı" }).click();
  await expect(scenarioNote).toHaveCount(0);
  await failedCard.getByRole("button", { name: "Kaldı" }).click();
  await expect(scenarioNote).toHaveValue("Başlık kayık");
  // A scenario note is enough; the composer lists what failed.
  await page.locator(".test-actions .test-primary").click();
  await expect(sendBackForm).toContainText("Senaryo 1 (Sayfayı aç)");
  await expect(sendBackForm).toContainText("Başlık kayık");
  await expect(sendBackForm).toContainText("isteğe bağlı");
  await expect(submit).toBeEnabled();
  await page
    .getByLabel("Geri gönderme notu", { exact: true })
    .fill("Görünüm hatalı");
  const png = (name: string) => ({
    name,
    mimeType: "image/png",
    buffer: Buffer.from("89504e470d0a1a0a", "hex"),
  });
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toHaveAttribute("multiple", "");
  await fileInput.setInputFiles([png("ekran.png"), png("ikinci.png")]);
  await expect(sendBackForm.locator(".test-attachments img")).toHaveCount(2);
  await expect(sendBackForm.locator(".test-attachments img").first()).toHaveCSS(
    "width",
    "120px",
  );
  const remove = sendBackForm.getByRole("button", {
    name: "Eki kaldır: ikinci.png",
  });
  await expect(remove).toHaveCSS("height", "24px");
  await remove.click();
  await expect(sendBackForm.locator(".test-attachments img")).toHaveCount(1);
  // The drop zone stays; a bad file reports an error and keeps the others.
  await fileInput.setInputFiles([
    { name: "not.txt", mimeType: "text/plain", buffer: Buffer.from("x") },
    png("ucuncu.png"),
  ]);
  await expect(page.locator(".test-actions [role=alert]")).toContainText(
    "not.txt",
  );
  await expect(sendBackForm.locator(".test-attachments img")).toHaveCount(2);
  await submit.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const returned = await (await request.get("/api/v1/items/HUMAN-1")).json();
  expect(returned.return_note).toBe(
    "Görünüm hatalı\n\nSenaryo 1 (Sayfayı aç): Başlık kayık",
  );
  expect(returned.return_attachments).toHaveLength(2);
  expect(returned.status).toBe("in_progress");
  expect(returned.assignee).toBe("codex");
  await request.patch(
    `/api/v1/items/HUMAN-1/scenarios/${returned.scenarios[0].id}`,
    { data: { result: "passed" } },
  );
  await request.patch("/api/v1/items/HUMAN-1", {
    data: { status: "test", assignee: "mert" },
  });
  await page.reload();
  await page.getByText("Test edilecek", { exact: true }).first().click();
  // Asking for In Progress from the status menu takes the same send-back path.
  await page.getByRole("button", { name: /^Durum/ }).click();
  await page.getByRole("menuitemradio", { name: "In Progress" }).click();
  await expect(sendBackForm).toBeVisible();
  await sendBackForm.getByRole("button", { name: "Vazgeç" }).click();
  await page.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await (await request.get("/api/v1/items/HUMAN-1")).json()).status,
  ).toBe("done");
});

test("senaryo yerinde düzenlenir, satır içi onayla silinir ve not tek başına yeter", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "tr"));
  const headers = { "X-Pano-Actor": "codex" };
  await request.post("/api/v1/projects", {
    data: { key: "SCENE", name: "Senaryo testi" },
    headers,
  });
  await request.post("/api/v1/projects/SCENE/items", {
    data: { title: "Senaryo işi", assignee: "codex" },
    headers,
  });
  for (const steps_md of ["İlk adım", "İkinci adım", "Üçüncü adım"])
    await request.post("/api/v1/items/SCENE-1/scenarios", {
      data: { steps_md, expected_md: "Olur", author: "codex" },
      headers,
    });
  await request.patch("/api/v1/items/SCENE-1", {
    data: { status: "test", assignee: "mert" },
    headers,
  });
  await page.goto("/projects/SCENE");
  await page.getByText("Senaryo işi", { exact: true }).first().click();
  const card = (text: string) =>
    page.locator(".test-scenario").filter({ hasText: text });
  const menu = (text: string) =>
    card(text).getByRole("button", { name: "Diğer işlemler" });
  // Result buttons stay on the row; edit and delete live in the menu.
  await expect(
    card("İlk adım").getByRole("button", { name: "Geçti" }),
  ).toBeVisible();
  await expect(card("İlk adım").locator(".test-icon")).toHaveCount(1);

  // Edit in place: the card becomes the form, not the end of the list.
  await menu("İkinci adım").click();
  await page.getByRole("menuitem", { name: "Düzenle" }).click();
  const form = page.locator(".test-scenario form");
  await expect(form).toHaveCount(1);
  // A filled textarea's text counts as label text, so match by label start.
  const stepsField = form.getByLabel(/^Adımlar/);
  await expect(stepsField).toHaveValue("İkinci adım");
  await expect(stepsField).toBeFocused();
  await expect(form).not.toContainText("Eklemek için");
  await expect(
    page.locator(".test-scenario").nth(1).locator("form"),
  ).toHaveCount(1);
  await stepsField.fill("Yeni adım");
  await form.getByRole("button", { name: "Vazgeç" }).click();
  await expect(card("İkinci adım")).toBeVisible();
  await menu("İkinci adım").click();
  await page.getByRole("menuitem", { name: "Düzenle" }).click();
  await stepsField.fill("Yeni adım");
  await form.getByRole("button", { name: "Kaydet" }).click();
  await expect(card("Yeni adım")).toBeVisible();
  await expect(form).toHaveCount(0);

  // Delete asks inside the card without opening another dialog.
  await menu("Üçüncü adım").click();
  await page.getByRole("menuitem", { name: "Sil…" }).click();
  const confirm = card("Üçüncü adım").getByRole("group", {
    name: "Bu senaryo silinsin mi?",
  });
  await expect(confirm.getByRole("button", { name: "Vazgeç" })).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await confirm.getByRole("button", { name: "Vazgeç" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page.locator(".test-scenario")).toHaveCount(3);
  await menu("Üçüncü adım").click();
  await page.getByRole("menuitem", { name: "Sil…" }).click();
  await confirm.getByRole("button", { name: "Sil", exact: true }).click();
  await expect(page.locator(".test-scenario")).toHaveCount(2);

  // Only scenario notes: no general note, no attachments.
  await card("Yeni adım").getByRole("button", { name: "Kaldı" }).click();
  await card("Yeni adım").getByLabel("Senaryo notu").fill("Açılmadı");
  await card("İlk adım").getByRole("button", { name: "Kaldı" }).click();
  await expect(card("İlk adım").getByLabel("Senaryo notu")).toBeVisible();
  await page.locator(".test-actions .test-primary").click();
  await page
    .getByRole("form", { name: "Geri gönder", exact: true })
    .getByRole("button", { name: "Geri gönder", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const returned = await (await request.get("/api/v1/items/SCENE-1")).json();
  expect(returned.return_note).toBe(
    "Senaryo 1 (İlk adım)\nSenaryo 2 (Yeni adım): Açılmadı",
  );
});

test("test paneli boş alanları gizler, markdown düzenler ve AI testlerini ayırır", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "tr"));
  const headers = { "X-Pano-Actor": "codex" };
  await request.post("/api/v1/projects", {
    data: { key: "PANEL", name: "Panel testi" },
    headers,
  });
  await request.post("/api/v1/projects/PANEL/items", {
    data: {
      title: "Panel görünümü",
      criteria: ["Kriter işareti"],
    },
    headers,
  });
  const detail = await (await request.get("/api/v1/items/PANEL-1")).json();
  await request.patch("/api/v1/items/PANEL-1", {
    data: { status: "test" },
    headers,
  });
  await request.patch(
    `/api/v1/items/PANEL-1/criteria/${detail.criteria[0].id}`,
    { data: { done: true }, headers },
  );
  await page.goto("/projects/PANEL");
  await page.getByText("Panel görünümü", { exact: true }).first().click();
  const panel = page.locator(".test-panel");
  await expect(
    panel.getByRole("heading", { name: "Ne değişti", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("heading", { name: "Nasıl denerim", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("heading", { name: "AI'ın kendi testleri" }),
  ).toHaveCount(0);
  await panel.getByRole("button", { name: "Ne değişti", exact: true }).click();
  await panel
    .getByLabel("Ne değişti", { exact: true })
    .fill("**Görünüm düzeldi**");
  await panel.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(panel.locator("strong")).toHaveText("Görünüm düzeldi");
  await panel.getByRole("button", { name: "Düzenle", exact: true }).click();
  await panel.locator("textarea").fill("");
  await panel.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "Ne değişti", exact: true }),
  ).toHaveCount(0);
  await request.post("/api/v1/items/PANEL-1/records", {
    data: { kind: "check", message: "Unit 18/18 passed" },
    headers,
  });
  await request.post("/api/v1/items/PANEL-1/records", {
    data: { kind: "check", message: "Build failed" },
    headers,
  });
  await page.reload();
  await page.getByText("Panel görünümü", { exact: true }).first().click();
  await expect(panel.locator(".test-checks li")).toHaveCount(2);
  await expect(panel.locator(".test-check-passed")).toContainText(
    "Geçti: Unit 18/18 passed",
  );
  await expect(panel.locator(".test-check-failed")).toContainText(
    "Kaldı: Build failed",
  );
  const approve = page.getByRole("button", { name: "Onayla", exact: true });
  await expect(approve).toHaveCSS("min-height", "36px");
  await expect(approve).toHaveCSS("border-radius", "10px");
  await expect(approve).toHaveCSS("background-color", "rgb(0, 113, 227)");
  await expect(page.locator(".test-actions")).toHaveCSS("position", "sticky");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await request.patch("/api/v1/items/PANEL-1", {
    data: { status: "in_progress", reason: "Panel kontrolü" },
    headers,
  });
  await page.reload();
  await page.getByText("Panel görünümü", { exact: true }).first().click();
  await expect(panel).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Kabul kriterleri", exact: true }),
  ).toBeVisible();
});
