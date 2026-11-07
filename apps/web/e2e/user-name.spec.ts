import { expect, test } from "@playwright/test";

test("bilinmeyen agent'a atanan Test kartı beklemez, human ve boş bekler; ad ayarlardan değişir", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "tr"));
  const headers = { "X-Pano-Actor": "cursor:review" };
  await request.post("/api/v1/projects", {
    data: { key: "IDENT", name: "Kimlik" },
    headers,
  });
  for (const [title, assignee] of [
    ["Cursor işi", "cursor:review"],
    ["İnsan işi", "human"],
    ["Boş iş", null],
  ]) {
    const item = await (
      await request.post("/api/v1/projects/IDENT/items", {
        data: { title, assignee },
        headers,
      })
    ).json();
    await request.post(`/api/v1/items/${item.key}/move`, {
      data: { status: "test" },
      headers,
    });
  }
  const human = await (await request.get("/api/v1/items/IDENT-2")).json();
  expect(human.assignee).toBe("mert");
  await page.goto("/projects/IDENT");
  const awaiting = (title: string) =>
    page
      .locator(".board-card")
      .filter({ hasText: title })
      .locator(".awaiting-badge");
  await expect(awaiting("Cursor işi")).toHaveCount(0);
  await expect(awaiting("İnsan işi")).toHaveCount(1);
  await expect(awaiting("Boş iş")).toHaveCount(1);
  await page.locator(".board-card").filter({ hasText: "İnsan işi" }).click();
  await expect(page.locator(".sheet-band")).toContainText(
    "Cursor · Review bu işi test etmeni istiyor",
  );
  await page.keyboard.press("Escape");

  // Writes carry the name from settings, here with a letter a raw header cannot hold.
  await page.getByRole("button", { name: "Ayarlar", exact: true }).click();
  const name = page.getByLabel("Adın:");
  await expect(name).toHaveValue("mert");
  await name.fill("Şükrü");
  await name.press("Enter");
  await expect
    .poll(
      async () => (await (await request.get("/api/v1/system")).json()).userName,
    )
    .toBe("Şükrü");
  await page.keyboard.press("Escape");
  await expect(awaiting("İnsan işi")).toHaveCount(0);
  await page.locator(".board-card").filter({ hasText: "Boş iş" }).click();
  await page.getByRole("button", { name: /^Atanan:/ }).click();
  await page.getByRole("menuitemradio", { name: "Şükrü" }).click();
  await expect(
    page.getByRole("button", { name: "Atanan: Şükrü" }),
  ).toBeVisible();
  const saved = await (
    await request.get("/api/v1/items/IDENT-3?history=true")
  ).json();
  expect(saved.assignee).toBe("Şükrü");
  expect(saved.activity[0].actor).toBe("Şükrü");
  await request.patch("/api/v1/settings", { data: { userName: "mert" } });
});
