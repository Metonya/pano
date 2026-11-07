import { expect, type Page, test } from "@playwright/test";

const openForm = async (page: Page, key: string) => {
  await page.request.post("/api/v1/projects", {
    data: { key, name: `${key} project` },
  });
  await page.goto(`/projects/${key}`);
  await page.getByRole("button", { name: "New PBI" }).click();
  return page.getByRole("dialog");
};

test("a complete card keeps its description, assignee, priority and criteria", async ({
  page,
}) => {
  const dialog = await openForm(page, "FULL");
  await dialog.getByRole("textbox", { name: "Title" }).fill("Complete card");
  await dialog
    .getByRole("textbox", { name: "Description" })
    .fill("## Why\n\nThis has **bold** text.");

  await dialog.getByRole("button", { name: "Priority: Medium" }).click();
  await page.getByRole("menuitemradio", { name: "High" }).click();
  await dialog.getByRole("button", { name: "Assignee: Unassigned" }).click();
  await page.getByRole("menuitemradio", { name: "Codex" }).click();
  await expect(
    dialog.getByRole("button", { name: "Assignee: Codex" }),
  ).toBeVisible();

  const criteria = dialog.getByRole("textbox", { name: "Acceptance criteria" });
  await expect(criteria).toHaveAccessibleDescription("One per line");
  await criteria.fill("First check\n\n  Second check  ");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toHaveCount(0);

  const card = page.locator(".board-card").filter({ hasText: "Complete card" });
  await expect(card.getByText("High", { exact: true })).toBeVisible();
  await expect(card.getByText("Codex", { exact: true })).toBeVisible();
  await expect(card.getByText("0/2", { exact: true })).toBeVisible();

  await card.click();
  const detail = page.getByRole("dialog");
  await expect(
    detail.getByRole("heading", { name: "Why", exact: true }),
  ).toBeVisible();
  await expect(detail.locator(".markdown strong")).toHaveText("bold");
  await expect(
    detail.getByRole("button", { name: "Priority: High" }),
  ).toBeVisible();
  await expect(
    detail.getByRole("button", { name: "Assignee: Codex" }),
  ).toBeVisible();
  await expect(
    detail.getByRole("checkbox", { name: "First check", exact: true }),
  ).toBeVisible();
  await expect(
    detail.getByRole("checkbox", { name: "Second check", exact: true }),
  ).toBeVisible();
  await expect(detail.getByRole("checkbox")).toHaveCount(2);
});

test("a title alone still creates a card with the defaults", async ({
  page,
}) => {
  const dialog = await openForm(page, "ONLY");
  const create = dialog.getByRole("button", { name: "Create" });
  await expect(create).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Title" }).fill("   ");
  await expect(create).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Title" }).fill("Only a title");
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);

  const response = await page.request.get("/api/v1/items/ONLY-1");
  expect(await response.json()).toMatchObject({
    title: "Only a title",
    body_md: "",
    priority: "medium",
    assignee: null,
    criteria: [],
  });
  await expect(
    page.locator(".board-card").filter({ hasText: "Only a title" }),
  ).toBeVisible();
});

test("the priority menu works from the keyboard and Escape only closes the menu", async ({
  page,
}) => {
  const dialog = await openForm(page, "KEYS");
  const trigger = dialog.getByRole("button", { name: "Priority: Medium" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitemradio", { name: "Medium" }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByText("You have unsaved changes")).toHaveCount(0);

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitemradio", { name: "High" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitemradio", { name: "Medium" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitemradio", { name: "Low" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Priority: Low" }),
  ).toBeFocused();

  await dialog.getByRole("textbox", { name: "Title" }).fill("Low from keys");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toHaveCount(0);
  const response = await page.request.get("/api/v1/items/KEYS-1");
  expect((await response.json()).priority).toBe("low");
});

test("each new field alone makes closing ask, and a discarded draft is gone", async ({
  page,
}) => {
  const dialog = await openForm(page, "DIRTY");
  const description = dialog.getByRole("textbox", { name: "Description" });
  const question = page.getByText("You have unsaved changes", { exact: true });

  await description.fill("Only a description");
  await page.keyboard.press("Escape");
  await expect(question).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Keep editing" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(description).toHaveValue("Only a description");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(question).toBeVisible();
  await page.getByRole("button", { name: "Close without saving" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "New PBI" }).click();
  await expect(description).toHaveValue("");
  await dialog.getByRole("button", { name: "Assignee: Unassigned" }).click();
  await page.getByRole("menuitemradio", { name: "Claude" }).click();
  await page.mouse.click(5, 5);
  await expect(question).toBeVisible();
  await page.getByRole("button", { name: "Close without saving" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "New PBI" }).click();
  await expect(
    dialog.getByRole("button", { name: "Assignee: Unassigned" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("on a small phone the form scrolls inside the dialog and the page stays put", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 560 });
  const dialog = await openForm(page, "SMALL");
  const body = dialog.locator(".project-settings-body");
  const create = dialog.getByRole("button", { name: "Create" });
  const criteria = dialog.getByRole("textbox", { name: "Acceptance criteria" });

  const scroll = await body.evaluate((element) => ({
    content: element.scrollHeight,
    visible: element.clientHeight,
  }));
  expect(scroll.content).toBeGreaterThan(scroll.visible);
  await expect(create).toBeInViewport({ ratio: 1 });
  await criteria.scrollIntoViewIfNeeded();
  await expect(criteria).toBeInViewport();
  await expect(create).toBeInViewport({ ratio: 1 });

  const box = await dialog.boundingBox();
  if (!box) throw new Error("Dialog is not visible");
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(false);
  for (const trigger of [
    dialog.getByRole("button", { name: "Priority: Medium" }),
    dialog.getByRole("button", { name: "Assignee: Unassigned" }),
    create,
  ]) {
    const size = await trigger.boundingBox();
    expect(size?.height).toBeGreaterThanOrEqual(44);
  }
});

test("a failed create shows the error and keeps what was written", async ({
  page,
}) => {
  const dialog = await openForm(page, "FAIL");
  await dialog.getByRole("textbox", { name: "Title" }).fill("Kept title");
  await dialog.getByRole("textbox", { name: "Description" }).fill("Kept text");
  await page.route("**/api/v1/projects/FAIL/items", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 500, json: {} })
      : route.fallback(),
  );
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByRole("alert")).toBeInViewport();
  await expect(
    dialog.getByRole("textbox", { name: "Description" }),
  ).toHaveValue("Kept text");
});
