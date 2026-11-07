import { expect, test } from "@playwright/test";

test("Test waits for human and unassigned cards, excludes unknown agents and follows name changes", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
  const headers = { "X-Pano-Actor": "cursor:review" };
  await request.post("/api/v1/projects", {
    data: { key: "IDENT", name: "Identity" },
    headers,
  });
  for (const [title, assignee] of [
    ["Cursor item", "cursor:review"],
    ["Human item", "human"],
    ["Unassigned item", null],
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
  await expect(awaiting("Cursor item")).toHaveCount(0);
  await expect(awaiting("Human item")).toHaveCount(1);
  await expect(awaiting("Unassigned item")).toHaveCount(1);
  await page.locator(".board-card").filter({ hasText: "Human item" }).click();
  await expect(page.locator(".sheet-band")).toContainText(
    "Cursor · Review wants you to test this",
  );
  await page.keyboard.press("Escape");

  // Writes carry the name from settings, here with a letter a raw header cannot hold.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const name = page.getByLabel("Your name:");
  await expect(name).toHaveValue("mert");
  await name.fill("Şükrü");
  await name.press("Enter");
  await expect
    .poll(
      async () => (await (await request.get("/api/v1/system")).json()).userName,
    )
    .toBe("Şükrü");
  await page.keyboard.press("Escape");
  await expect(awaiting("Human item")).toHaveCount(0);
  await page
    .locator(".board-card")
    .filter({ hasText: "Unassigned item" })
    .click();
  await page.getByRole("button", { name: /^Assignee:/ }).click();
  await page.getByRole("menuitemradio", { name: "Şükrü" }).click();
  await expect(
    page.getByRole("button", { name: "Assignee: Şükrü" }),
  ).toBeVisible();
  const saved = await (
    await request.get("/api/v1/items/IDENT-3?history=true")
  ).json();
  expect(saved.assignee).toBe("Şükrü");
  expect(saved.activity[0].actor).toBe("Şükrü");
  await request.patch("/api/v1/settings", { data: { userName: "mert" } });
});
