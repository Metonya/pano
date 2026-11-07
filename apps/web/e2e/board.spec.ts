import { expect, test } from "@playwright/test";
import { onlyProjects } from "./helpers";

test("agent-reported usage appears only when data exists", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "USAGE", name: "Usage" },
  });
  await request.post("/api/v1/projects/USAGE/items", {
    data: { title: "Quiet item", assignee: "codex", criteria: ["One"] },
  });
  await page.goto("/projects/USAGE");
  const quiet = page.locator(".board-card").filter({ hasText: "Quiet item" });
  await expect(quiet).toBeVisible();
  await expect(quiet.locator(".card-usage")).toHaveCount(0);
  await expect(quiet).not.toContainText("token");
  await quiet.click();
  await expect(page.getByRole("button", { name: /^Status/ })).toBeVisible();
  await expect(page.locator(".sheet-usage")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator(".board-summary").click();
  await expect(page.locator(".summary-popover dl").first()).toBeVisible();
  await expect(page.locator(".summary-popover")).not.toContainText("token");
  await page.keyboard.press("Escape");

  await request.post("/api/v1/projects/USAGE/items", {
    data: {
      title: "Usage item",
      assignee: "claude:developer-with-a-very-long-name",
      criteria: ["One", "Two"],
    },
  });
  for (let run = 0; run < 3; run++)
    await request.post("/api/v1/items/USAGE-2/usage", {
      data: {
        model: "gpt-6.1-sol",
        effort: "high",
        input_tokens: 10000,
        output_tokens: 4000,
      },
      headers: { "X-Pano-Actor": "codex" },
    });
  const card = page.locator(".board-card").filter({ hasText: "Usage item" });
  await expect(card.locator(".card-usage")).toHaveText(/^42K tokens$/);
  await expect(card.locator(".criteria-progress")).toBeVisible();
  // A long agent name squeezes the tokens first: the progress keeps its room.
  const progress = await card.locator(".criteria-progress").boundingBox();
  expect(progress?.width ?? 0).toBeGreaterThanOrEqual(60);
  const foot = await card.locator(".board-card-foot").boundingBox();
  const usage = await card.locator(".card-usage").boundingBox();
  expect((usage?.x ?? 0) + (usage?.width ?? 0)).toBeLessThanOrEqual(
    (foot?.x ?? 0) + (foot?.width ?? 0) + 1,
  );
  await card.click();
  const line = page.locator(".sheet-usage");
  await expect(line).toContainText(
    /^gpt-6\.1-sol · high · 42K tokens · 3 runs/,
  );
  await expect(line).not.toContainText("Codex");
  await expect(line).not.toContainText("context");
  await expect(line).toContainText("Values reported by the agent");
  await page.keyboard.press("Escape");
  await page.locator(".board-summary").click();
  await expect(page.locator(".summary-popover")).toContainText(
    /Total tokens \(reported\)\s*42K/,
  );
  await page.keyboard.press("Escape");

  // The agent's own total wins over input + output, and the largest context shows.
  await request.post("/api/v1/projects/USAGE/items", {
    data: { title: "Item with context", assignee: "claude:po" },
  });
  for (const data of [
    {
      model: "claude-opus-5-5",
      effort: "high",
      input_tokens: 1000,
      output_tokens: 1000,
      total_tokens: 100000,
      context_tokens: 45000,
      duration_ms: 240000,
    },
    { total_tokens: 88000, context_tokens: 20000, duration_ms: 180000 },
  ])
    await request.post("/api/v1/items/USAGE-3/usage", {
      data,
      headers: { "X-Pano-Actor": "claude:po" },
    });
  const reported = page
    .locator(".board-card")
    .filter({ hasText: "Item with context" });
  await expect(reported.locator(".card-usage")).toHaveText(/^188K tokens$/);
  await reported.click();
  await expect(line).toContainText(
    /^claude-opus-5-5 · high · 188K tokens · 45K context · 7 min · 2 runs/,
  );
  await expect(line).not.toContainText("Claude");
  await expect(line).not.toContainText("PO");
  await expect(line).toContainText("Values reported by the agent");
  await page.keyboard.press("Escape");
  await page.locator(".board-summary").click();
  await expect(page.locator(".summary-popover")).toContainText(
    /Total tokens \(reported\)\s*230K/,
  );
});

test("board creation, criteria, moves, live updates and filtering", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "BOARD", name: "Board test" },
  });
  await page.goto("/projects/BOARD");
  await page.getByRole("button", { name: "New PBI" }).click();
  // Not by label: the sidebar's star buttons carry other projects' names.
  await page.getByRole("textbox", { name: "Title" }).fill("Board item");
  await page.getByRole("button", { name: "Create" }).click();
  const card = page.locator(".board-card").filter({ hasText: "Board item" });
  await card.click();
  await page.getByLabel("New criterion").fill("Check it");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Check it" })).toBeVisible();
  await page.getByRole("button", { name: "Edit criterion: Check it" }).click();
  await page
    .getByLabel("Edit criterion", { exact: true })
    .fill("Updated criterion");
  await page.getByRole("button", { name: "Save" }).click();
  await page
    .getByRole("checkbox", { name: "Updated criterion", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Delete criterion: Updated criterion" })
    .click();
  // Deleting asks inside the row first; cancelling keeps the criterion.
  const confirm = page.getByRole("group", { name: "Delete this criterion?" });
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Updated criterion", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete criterion: Updated criterion" })
    .click();
  await confirm.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByLabel("Updated criterion")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(card).not.toContainText("1/1");
  await expect(card).toBeFocused();
  // Move in small steps like a real pointer so dnd-kit can track the target.
  const handleBox = await card.boundingBox();
  const columnBox = await page
    .locator(".board-column")
    .filter({ hasText: "Test" })
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
  // The drag sensor has no reliable observable settling state before release.
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(
    page.locator(".board-column").filter({ hasText: "Test" }),
  ).toContainText("Board item");
  // The card moves at once; a later move must not overtake this request.
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/v1/items/BOARD-1")).json()).status,
    )
    .toBe("test");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toHaveCSS("opacity", "1");
  expect(
    await page
      .locator(".board-column-scroll")
      .evaluateAll((columns) =>
        columns.every((column) => column.scrollWidth <= column.clientWidth),
      ),
  ).toBe(true);
  await request.post("/api/v1/items/BOARD-1/move", {
    data: { status: "test" },
  });
  await expect(
    page.locator(".board-column").filter({ hasText: "Test" }),
  ).toContainText("Board item");
  await request.post("/api/v1/items/BOARD-1/move", {
    data: { status: "done" },
  });
  await expect(
    page.locator(".board-column").filter({ hasText: "Done" }),
  ).toContainText("Board item");
  await expect(card.getByRole("img", { name: "Unseen" })).toBeVisible();
  await card.click();
  await page.keyboard.press("Escape");
  await expect(card.getByRole("img", { name: "Unseen" })).toHaveCount(0);
  await request.post("/api/v1/projects/BOARD/items", {
    data: { title: "Other item", assignee: "mert" },
  });
  await request.post("/api/v1/items/BOARD-1/assign", {
    data: { assignee: "codex" },
  });
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Codex" }).click();
  // The menu stays open so several filters can be set together.
  await expect(page.getByRole("menuitemradio", { name: "High" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Filter: 1" })).toBeVisible();
  await expect(card).toBeVisible();
  await expect(
    page.locator(".board-card").filter({ hasText: "Other item" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Filter: 1" }).click();
  await page.getByRole("menuitem", { name: "Clear filters" }).click();
  await expect(
    page.locator(".board-card").filter({ hasText: "Other item" }),
  ).toBeVisible();
  // Search opens from its icon and closes again with Esc.
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("textbox", { name: "Search" }).fill("Other");
  await expect(card).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search" }).press("Escape");
  await expect(page.getByRole("textbox", { name: "Search" })).toHaveCount(0);
  await expect(card).toBeVisible();
});

test("keyboard moves between columns persist after reload", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "KEYBOARD", name: "Klavye" },
  });
  await request.post("/api/v1/projects/KEYBOARD/items", {
    data: { title: "Keyboard item" },
  });
  await page.goto("/projects/KEYBOARD");
  const card = page.locator(".board-card").filter({ hasText: "Keyboard item" });
  const handle = card;
  await handle.focus();
  await page.keyboard.press("Space");
  // The keyboard sensor exposes no observable ready state, so this wait stays.
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
  ).toContainText("Keyboard item");
});

test("projects with Test disabled show three columns", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "NOTEST", name: "Testsiz", test_column: false },
  });
  await request.post("/api/v1/projects/NOTEST/items", {
    data: { title: "An item" },
  });
  await page.goto("/projects/NOTEST");
  await expect(page.locator(".board-column")).toHaveCount(3);
  await expect(
    page.locator(".board-column h2").filter({ hasText: /^Test/ }),
  ).toHaveCount(0);
});

test("criterion checks appear immediately and roll back on request failure", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "CRITERIA", name: "Criterion" },
  });
  await request.post("/api/v1/projects/CRITERIA/items", {
    data: { title: "Check", criteria: ["Criterion"] },
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
  const card = page.locator(".board-card").filter({ hasText: "Check" });
  await card.click();
  const checkbox = page.getByRole("checkbox", { name: "Criterion" });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expect(card).toContainText("1/1");
  await expect.poll(() => !!rejectRequest).toBe(true);
  rejectRequest?.();
  await expect(checkbox).not.toBeChecked();
  await expect(card).toContainText("0/1");
  await expect(page.getByRole("alert")).toContainText(
    "Could not complete the action",
  );
});

test("board fits a 375 pixel viewport", async ({ page, request }) => {
  await request.post("/api/v1/projects", {
    data: { key: "MOBILE", name: "Mobile" },
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/projects/MOBILE");
  await expect(page.getByRole("button", { name: "New PBI" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("desktop scrolls only columns; empty columns fill the available height", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "SCROLL", name: "Scrolling" },
  });
  for (let i = 1; i <= 16; i++)
    await request.post("/api/v1/projects/SCROLL/items", {
      data: { title: `Scrolling item ${i}` },
    });
  await request.post("/api/v1/items/SCROLL-1/move", {
    data: { status: "cancelled", reason: "No longer needed" },
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects/SCROLL");
  const backlog = page.locator(".board-column").filter({ hasText: "Backlog" });
  const scroller = backlog.locator(".board-column-scroll");
  await expect(backlog.locator(".board-card").first()).toBeVisible();
  const pageFits = () =>
    page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    );
  expect(await pageFits()).toBe(true);
  expect(
    await scroller.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);

  const toolbarTop = await page.locator(".toolbar").boundingBox();
  const summaryTop = await page.locator(".board-summary").boundingBox();
  const box = await scroller.boundingBox();
  if (!box) throw new Error("Column is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 400);
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.locator(".toolbar").boundingBox()).toEqual(toolbarTop);
  expect(await page.locator(".board-summary").boundingBox()).toEqual(
    summaryTop,
  );

  // Columns reach the bottom of the screen; an empty one is a full drop area.
  const empty = await page
    .locator(".board-column")
    .filter({ hasText: "In Progress" })
    .boundingBox();
  const full = await backlog.boundingBox();
  expect(empty?.height).toBe(full?.height);
  expect((full?.y ?? 0) + (full?.height ?? 0)).toBe(900);

  // The last card keeps some room under it.
  await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const last = await backlog.locator(".board-card").last().boundingBox();
  expect(900 - ((last?.y ?? 0) + (last?.height ?? 0))).toBeGreaterThanOrEqual(
    12,
  );

  // The cancelled list has its own height limit and leaves the board in place.
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("menuitemcheckbox").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".cancelled-list")).toBeVisible();
  expect(await pageFits()).toBe(true);
  expect(
    (await page.locator(".cancelled-list").boundingBox())?.height,
  ).toBeLessThanOrEqual(168);
});

test("mobile scrolls the page without internal column scrolling", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "SCROLLM", name: "Mobile scrolling" },
  });
  for (let i = 1; i <= 12; i++)
    await request.post("/api/v1/projects/SCROLLM/items", {
      data: { title: `Mobile item ${i}` },
    });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/projects/SCROLLM");
  await expect(page.locator(".board-card").first()).toBeVisible();
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await expect(page.locator(".toolbar")).toBeInViewport();
  const scroller = page.locator(
    ".board-column.mobile-active .board-column-scroll",
  );
  expect(await scroller.evaluate((el) => getComputedStyle(el).overflowY)).toBe(
    "visible",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("description fills the panel width; cancellation label has space above the field", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "FORM", name: "Form" },
  });
  await request.post("/api/v1/projects/FORM/items", {
    data: { title: "Form item", body_md: "Old description" },
  });
  await page.goto("/projects/FORM");
  await page.locator(".board-card").filter({ hasText: "Form item" }).click();
  const sheetBody = page.locator(".sheet-body");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Description" });
  await expect
    .poll(async () => (await field.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(220);
  const [fieldBox, bodyBox] = [
    await field.boundingBox(),
    await sheetBody.boundingBox(),
  ];
  // Body padding is 32px on each side.
  expect(fieldBox?.width).toBeGreaterThanOrEqual((bodyBox?.width ?? 0) - 80);
  expect(fieldBox?.height).toBeGreaterThanOrEqual(220);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem").click();
  const reason = page.getByRole("dialog").last().getByRole("textbox");
  await expect(reason).toBeFocused();
  expect(
    await reason.evaluate((input) => {
      const range = document.createRange();
      const label = input.closest("label");
      if (!label?.firstChild) return 0;
      range.selectNode(label.firstChild);
      return (
        input.getBoundingClientRect().top - range.getBoundingClientRect().bottom
      );
    }),
  ).toBeGreaterThanOrEqual(8);
});

test("PBI title edits inline and stays current in the panel and card", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "TITLE", name: "Title" },
  });
  await request.post("/api/v1/projects/TITLE/items", {
    data: { title: "Old title" },
  });
  await page.goto("/projects/TITLE");
  const cards = page.locator(".board-card");
  await cards.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("Old title");
  const open = dialog.getByRole("button", { name: "Edit title" });
  const field = dialog.getByRole("textbox", { name: "Edit title" });

  // Same size and weight as the title; the layout stays where it was.
  await expect(open).toHaveCSS("font-size", "24px");
  await expect(open).toHaveCSS("font-weight", "700");
  // The opening animation scales the sheet: measure after it has settled.
  await dialog.locator(".sheet-properties").waitFor();
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished)),
  );
  const shown = await open.boundingBox();
  const next = await dialog.locator(".sheet-properties").boundingBox();
  await open.click();
  await expect(field).toBeFocused();
  await expect(field).toHaveCSS("font-size", "24px");
  await expect(field).toHaveCSS("font-weight", "700");
  expect(await field.boundingBox()).toEqual(shown);
  expect(await dialog.locator(".sheet-properties").boundingBox()).toEqual(next);

  // Esc only leaves the editor: nothing is saved and the panel stays open.
  await field.fill("Discarded title");
  await field.press("Escape");
  await expect(field).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(open).toBeFocused();
  await expect(dialog.getByRole("heading", { level: 2 })).toContainText(
    "Old title",
  );
  await expect(cards).toContainText("Old title");
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/v1/items/TITLE-1")).json()).title,
    )
    .toBe("Old title");

  // An empty title is never sent; the old text returns.
  await open.press("Enter");
  await expect(field).toBeFocused();
  await field.fill("   ");
  await field.press("Enter");
  await expect(field).toHaveCount(0);
  await expect(open).toContainText("Old title");

  // Enter saves; the panel and the card both show the new title at once.
  await open.click();
  await field.fill("New title");
  await field.press("Enter");
  await expect(field).toHaveCount(0);
  await expect(open).toContainText("New title");
  await expect(dialog).toHaveAccessibleName("New title");
  await expect(cards).toContainText("New title");
  await expect(open).toBeFocused();

  // Losing focus saves too, and a long title grows the field without clipping.
  await open.click();
  const long = "A very long title ".repeat(12).trim();
  await field.fill(long);
  expect(
    await field.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
  expect((await field.boundingBox())?.height).toBeGreaterThan(60);
  await dialog.getByRole("tab", { name: "History" }).focus();
  await expect(cards).toContainText("A very long title");
  await open.click();
  await field.fill("New title");
  await field.press("Enter");
  await expect(cards).not.toContainText("A very long");

  // Once saved nothing is left to lose, so Esc closes without asking.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await cards.click();
  await expect(open).toContainText("New title");

  // The history shows both the old and the new text.
  await dialog.getByRole("tab", { name: "History" }).click();
  const titleEdit = dialog
    .locator(".history-entry")
    .filter({ hasText: "Old title" });
  await expect(titleEdit.locator(".history-diff-line.removed")).toContainText(
    "Old title",
  );
  await expect(titleEdit.locator(".history-diff-line.added")).toContainText(
    "New title",
  );
});

test("failed title saves retain the input and prompt before closing", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "TITLEFAIL", name: "Title error" },
  });
  await request.post("/api/v1/projects/TITLEFAIL/items", {
    data: { title: "Saved title" },
  });
  await page.goto("/projects/TITLEFAIL");
  const card = page.locator(".board-card");
  await card.click();
  const dialog = page.getByRole("dialog");
  await page.route("**/api/v1/items/TITLEFAIL-1", (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 500,
          body: "{}",
          contentType: "application/json",
        })
      : route.continue(),
  );
  await dialog.getByRole("button", { name: "Edit title" }).click();
  const field = dialog.getByRole("textbox", { name: "Edit title" });
  await field.fill("Unsaved title");
  await field.press("Enter");
  await expect(dialog.getByRole("alert")).toContainText(
    "Could not complete the action",
  );
  await expect(field).toHaveValue("Unsaved title");
  await expect(card).toContainText("Saved title");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Close without saving" }),
  ).toBeVisible();
});

test("cancelled PBI titles remain editable", async ({ page, request }) => {
  await request.post("/api/v1/projects", {
    data: { key: "TITLECAN", name: "Cancelled title" },
  });
  await request.post("/api/v1/projects/TITLECAN/items", {
    data: { title: "Cancelled item" },
  });
  await request.post("/api/v1/items/TITLECAN-1/move", {
    data: { status: "cancelled", reason: "No longer needed" },
  });
  await page.goto("/projects/TITLECAN");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("menuitemcheckbox").click();
  await page.keyboard.press("Escape");
  await page.locator(".cancelled-list button").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Edit title" }).click();
  await dialog
    .getByRole("textbox", { name: "Edit title" })
    .fill("Cancelled item, new name");
  await page.keyboard.press("Enter");
  await expect(page.locator(".cancelled-list")).toContainText(
    "Cancelled item, new name",
  );
});

test("logo and favicon use the same board icon", async ({ page, request }) => {
  await page.goto("/");
  const bars = page.locator(".sidebar .brand-icon svg rect");
  await expect(bars).toHaveCount(3);
  await expect(page.locator(".sidebar .brand-icon")).toHaveCSS(
    "border-radius",
    "9px",
  );
  const href = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(href).toBe("/favicon.svg");
  const favicon = await request.get(href ?? "");
  expect(favicon.headers()["content-type"]).toContain("image/svg+xml");
  const svg = await favicon.text();
  for (const bar of await bars.evaluateAll((rects) =>
    rects.map((r) =>
      ["x", "y", "width", "height", "rx"]
        .map((name) => `${name}="${r.getAttribute(name)}"`)
        .join(" "),
    ),
  ))
    expect(svg).toContain(bar);
});

test("assignee list groups three Claude roles into one tool row", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
  await onlyProjects(page, "ROLES");
  await request.post("/api/v1/projects", {
    data: { key: "ROLES", name: "Roles" },
  });
  for (const assignee of [
    "claude:po",
    "claude:identity",
    "claude:card",
    "codex",
  ])
    await request.post("/api/v1/projects/ROLES/items", {
      data: { title: `Item ${assignee}`, assignee },
    });
  await page.goto("/projects/ROLES");
  const card = page
    .locator(".board-card")
    .filter({ hasText: "Item claude:identity" });
  // The card shows the tool; the full identity stays in its title.
  await expect(card.locator(".assignee")).toHaveText("Claude");
  await expect(card.locator(".assignee svg")).toHaveCount(1);
  await expect(card.locator(".assignee")).toHaveAttribute(
    "title",
    "claude:identity",
  );

  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await expect(page.getByRole("menuitemradio", { name: "Claude" })).toHaveCount(
    1,
  );
  await page.getByRole("menuitemradio", { name: "Claude" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".board-card")).toHaveCount(3);
  await expect(
    page.locator(".board-card").filter({ hasText: "Item codex" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Filter: 1" }).click();
  await page.getByRole("menuitemradio", { name: "All" }).first().click();
  await page.keyboard.press("Escape");

  await card.click();
  const assignee = page.getByRole("button", {
    name: "Assignee: Claude · Identity",
  });
  await expect(assignee).toBeVisible();
  await expect(page.locator(".sheet-assignee-role")).toHaveText("Identity");
  await assignee.click();
  await expect(page.getByRole("menuitemradio", { name: "Claude" })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("menuitemradio", { name: "Claude" }),
  ).toBeChecked();
  // The menu sizes its icons, but a logo stays inside the avatar circle.
  await expect(
    page
      .getByRole("menuitemradio", { name: "Claude" })
      .locator(".assignee-avatar svg"),
  ).toHaveCSS("width", "12px");
  await expect(page.getByRole("menuitemradio", { name: "Mert" })).toHaveCount(
    1,
  );
  await expect(page.getByRole("menuitemradio", { name: "Cursor" })).toHaveCount(
    1,
  );
  // The same tool again keeps the role and sends nothing.
  let assigned = 0;
  page.on("request", (r) => {
    if (r.url().includes("/assign")) assigned++;
  });
  await page.getByRole("menuitemradio", { name: "Claude" }).click();
  await expect(assignee).toBeVisible();
  expect(assigned).toBe(0);
  // Another tool from the menu is stored as the tool name.
  await assignee.click();
  await page.getByRole("menuitemradio", { name: "Cursor" }).click();
  await expect(
    page.getByRole("button", { name: "Assignee: Cursor" }),
  ).toBeVisible();
  const saved = await (await request.get("/api/v1/items/ROLES-2")).json();
  expect(saved.assignee).toBe("cursor");
  await page.keyboard.press("Escape");

  // In the sidebar every role of a tool is one row.
  await request.post("/api/v1/items/ROLES-1/move", {
    data: { status: "in_progress" },
  });
  await request.post("/api/v1/items/ROLES-3/move", {
    data: { status: "in_progress" },
  });
  await page.reload();
  await expect(page.locator(".agent-row")).toHaveCount(1);
  await expect(page.locator(".agent-row")).toContainText("Claude");
});
