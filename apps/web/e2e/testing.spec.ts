import { expect, test } from "@playwright/test";

test("insan testi geri gönderme, geri atama ve onay", async ({
  page,
  request,
}) => {
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
  await page.getByText("Test edilecek", { exact: true }).first().click();
  await expect(page.getByLabel("Adımlar", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "AI'ın kendi testleri" }),
  ).toHaveCount(0);
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
  await expect(page.getByText("İkinci senaryo", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Adımlar", { exact: true })).toHaveCount(0);
  await page
    .getByRole("group", { name: /1: Sayfayı aç/ })
    .getByRole("button", { name: "Kaldı" })
    .click();
  // A failed scenario opens the note straight away; only one send-back is on screen.
  const sendBackForm = page.getByRole("form", {
    name: "Geri gönder",
    exact: true,
  });
  await expect(sendBackForm).toBeVisible();
  await expect(page.getByRole("button", { name: "Geri ata" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Geri gönder", exact: true }),
  ).toHaveCount(1);
  await page
    .locator(".test-actions")
    .getByRole("button", { name: "Vazgeç", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Onayla" })).toBeDisabled();
  await expect(page.locator(".test-actions .test-primary")).toHaveText(
    "Geri gönder",
  );
  await expect(page.locator(".test-actions")).toContainText("Kalan senaryolar");
  await page.locator(".test-actions .test-primary").click();
  await page
    .getByLabel("Geri gönderme notu", { exact: true })
    .fill("Görünüm hatalı");
  await page.locator('input[type="file"]').setInputFiles({
    name: "ekran.png",
    mimeType: "image/png",
    buffer: Buffer.from("89504e470d0a1a0a", "hex"),
  });
  await sendBackForm
    .getByRole("button", { name: "Geri gönder", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const returned = await (await request.get("/api/v1/items/HUMAN-1")).json();
  expect(returned.return_note).toBe("Görünüm hatalı");
  expect(returned.return_attachments).toHaveLength(1);
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
