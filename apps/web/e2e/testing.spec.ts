import { expect, test } from "@playwright/test";

test("insan testi geri gönderme, geri atama ve onay", async ({
  page,
  request,
}) => {
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
  await page.getByLabel("Sayfayı aç").selectOption("failed");
  await expect(page.getByRole("button", { name: "Onayla" })).toBeDisabled();
  await page.getByRole("button", { name: "Geri gönder", exact: true }).click();
  await page.getByLabel("Not", { exact: true }).fill("Görünüm hatalı");
  await page.locator('input[type="file"]').setInputFiles({
    name: "ekran.png",
    mimeType: "image/png",
    buffer: Buffer.from("89504e470d0a1a0a", "hex"),
  });
  await page
    .getByRole("button", { name: "Geri gönder", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const returned = await (await request.get("/api/v1/items/HUMAN-1")).json();
  expect(returned.return_note).toBe("Görünüm hatalı");
  expect(returned.return_attachments).toHaveLength(1);
  await request.patch(
    `/api/v1/items/HUMAN-1/scenarios/${returned.scenarios[0].id}`,
    { data: { result: "passed" } },
  );
  await request.patch("/api/v1/items/HUMAN-1", {
    data: { status: "test", assignee: "mert" },
  });
  await page.reload();
  await page.getByText("Test edilecek", { exact: true }).first().click();
  await page.getByRole("button", { name: "Geri ata", exact: true }).click();
  await page.getByLabel("Not", { exact: true }).fill("Sen de kontrol et");
  await page
    .getByRole("button", { name: "Geri ata", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await (await request.get("/api/v1/items/HUMAN-1")).json()).assignee,
  ).toBe("codex");
  await request.patch("/api/v1/items/HUMAN-1", { data: { assignee: "mert" } });
  await page.reload();
  await page.getByText("Test edilecek", { exact: true }).first().click();
  await page.getByRole("button", { name: "Onayla" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await (await request.get("/api/v1/items/HUMAN-1")).json()).status,
  ).toBe("done");
});
