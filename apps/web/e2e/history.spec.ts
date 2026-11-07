import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
});

test("title and body diffs, filters, cancellation reason and restoration", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "HISTORY", name: "History" },
  });
  await request.post("/api/v1/projects/HISTORY/items", {
    data: { title: "Old title", body_md: "Shared\nOld line" },
  });
  await request.patch("/api/v1/items/HISTORY-1", {
    data: {
      title: "New title",
      body_md: "Shared\nNew line",
      reason: "Scope expanded",
    },
    headers: { "X-Pano-Actor": "codex" },
  });
  await request.patch("/api/v1/items/HISTORY-1", {
    data: { body_md: "Shared\nLast line" },
  });
  for (const [kind, message] of [
    ["decision", "Scope approved"],
    ["check", "Unit 18/18 passed"],
    ["check", "Build failed"],
  ])
    await request.post("/api/v1/items/HISTORY-1/records", {
      data: { kind, message },
    });
  await request.post("/api/v1/items/HISTORY-1/move", {
    data: { status: "in_progress" },
  });
  await page.goto("/projects/HISTORY");
  await page.locator(".board-card").filter({ hasText: "New title" }).click();
  await page.getByRole("tab", { name: "History" }).click();
  const history = page.getByRole("tabpanel", { name: "History" });
  await expect(history.locator(".history-timeline > li")).toHaveCount(7);
  // Moves read as stations: a coloured "from → to" pair.
  await expect(history.locator(".status-flow").first()).toContainText(
    "Backlog",
  );
  await expect(history.locator(".status-flow").first()).toContainText(
    "In Progress",
  );
  // Viewing a card or ticking a criterion is bookkeeping, shown only under All.
  await request.post("/api/v1/items/HISTORY-1/seen", {});
  await page.reload();
  await page.locator(".board-card").filter({ hasText: "New title" }).click();
  await page.getByRole("tab", { name: "History" }).click();
  await expect(history.locator(".history-timeline > li")).toHaveCount(7);
  await history.getByRole("button", { name: "All", exact: true }).click();
  await expect(history.locator(".history-timeline > li")).toHaveCount(8);
  await history.getByRole("button", { name: "Important", exact: true }).click();
  await history.getByRole("button", { name: "Show changes" }).last().click();
  await expect(history.locator(".removed")).toContainText([
    "Old title",
    "Old line",
  ]);
  await expect(history.locator(".added")).toContainText([
    "New title",
    "New line",
  ]);
  await expect(history).toContainText("Scope expanded");
  await expect(history.locator(".history-check.passed")).toContainText(
    "✓ Passed: Unit 18/18 passed",
  );
  await expect(history.locator(".history-check.failed")).toContainText(
    "✕ Failed: Build failed",
  );
  await history.getByRole("button", { name: "Decisions", exact: true }).click();
  await expect(history.locator(".history-timeline > li")).toHaveCount(1);
  await expect(history).toContainText("Scope approved");
  await history.getByRole("button", { name: "Tests", exact: true }).click();
  await expect(history.locator(".history-timeline > li")).toHaveCount(2);
  await history.getByRole("button", { name: "Important", exact: true }).click();
  await page.getByRole("button", { name: "More actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Cancel PBI…" }).click();
  const confirmation = page.getByRole("dialog", {
    name: "Cancel this PBI?",
  });
  const cancel = confirmation.getByRole("button", { name: "Cancel PBI" });
  await expect(cancel).toBeDisabled();
  await confirmation.getByLabel("Cancellation reason").fill("   ");
  await expect(cancel).toBeDisabled();
  await confirmation.getByLabel("Cancellation reason").fill("No longer needed");
  await cancel.click();
  await expect(confirmation).toHaveCount(0);
  await expect(history).toContainText("No longer needed");
  await expect(history.locator(".status-flow").first()).toContainText(
    "In Progress",
  );
  await expect(history.locator(".status-flow").first()).toContainText(
    "Cancelled",
  );
  await page
    .getByRole("button", { name: "Undo cancellation", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^Status/ })).toContainText(
    "In Progress",
  );
  await expect(history).toContainText("undid cancellation");
});

test("scenario and criterion records describe the changed content", async ({
  page,
  request,
}) => {
  const headers = { "X-Pano-Actor": "mert" };
  await request.post("/api/v1/projects", {
    data: { key: "HISTCHILD", name: "Content" },
  });
  await request.post("/api/v1/projects/HISTCHILD/items", {
    data: { title: "Content history" },
  });
  const url = "/api/v1/items/HISTCHILD-1";
  const scenario = await (
    await request.post(`${url}/scenarios`, {
      data: { steps_md: "Open the cart", expected_md: "Empty", author: "mert" },
      headers,
    })
  ).json();
  await request.patch(`${url}/scenarios/${scenario.id}`, {
    data: { expected_md: "Cart appears empty" },
    headers,
  });
  await request.patch(`${url}/scenarios/${scenario.id}`, {
    data: { result: "failed" },
    headers,
  });
  await request.delete(`${url}/scenarios/${scenario.id}`, { headers });
  const criterion = await (
    await request.post(`${url}/criteria`, {
      data: { text: "Old criterion" },
      headers,
    })
  ).json();
  await request.patch(`${url}/criteria/${criterion.id}`, {
    data: { text: "New criterion" },
    headers,
  });
  await request.delete(`${url}/criteria/${criterion.id}`, { headers });
  await page.goto("/projects/HISTCHILD");
  await page
    .locator(".board-card")
    .filter({ hasText: "Content history" })
    .click();
  await page.getByRole("tab", { name: "History" }).click();
  const history = page.getByRole("tabpanel", { name: "History" });
  const rows = history.locator(".history-timeline > li");
  // Important: the result change alone stays out, the content changes stay in.
  await expect(history).toContainText(
    "Mert deleted the scenario: Open the cart",
  );
  await expect(history).not.toContainText("marked the scenario Failed");
  await expect(rows).toHaveCount(7);
  const removed = rows.filter({ hasText: "deleted the scenario" });
  await expect(removed.locator(".removed del")).toHaveText([
    "Open the cart",
    "Expected: Cart appears empty",
  ]);
  const edited = rows.filter({ hasText: "edited the scenario" });
  await expect(edited.locator(".removed")).toContainText("Empty");
  await expect(edited.locator(".added")).toContainText("Cart appears empty");
  const criterionEdit = rows.filter({ hasText: "edited criterion" });
  await expect(criterionEdit.locator(".removed")).toContainText(
    "Old criterion",
  );
  await expect(criterionEdit.locator(".added")).toContainText("New criterion");
  await expect(history).toContainText("Mert deleted criterion: New criterion");
  await expect(history).not.toContainText("Reason");
  await expect(history).not.toContainText("scenario_");
  await expect(history).not.toContainText("criterion_");
  await history.getByRole("button", { name: "Tests", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(
    "Mert marked the scenario Failed: Open the cart",
  );
  await history.getByRole("button", { name: "All", exact: true }).click();
  await expect(history).not.toContainText("scenario_");
  await expect(history).not.toContainText("Reason");
});

test("usage records appear under All and stay out of Important and Tests", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "HISTUSE", name: "Usage" },
  });
  await request.post("/api/v1/projects/HISTUSE/items", {
    data: { title: "Usage item" },
  });
  await request.post("/api/v1/items/HISTUSE-1/usage", {
    data: {
      model: "gpt-6.1-sol",
      effort: "high",
      input_tokens: 12000,
      output_tokens: 3000,
      duration_ms: 120000,
      note: "First run",
    },
    headers: { "X-Pano-Actor": "codex" },
  });
  await page.goto("/projects/HISTUSE");
  await page.locator(".board-card").filter({ hasText: "Usage item" }).click();
  await page.getByRole("tab", { name: "History" }).click();
  const history = page.getByRole("tabpanel", { name: "History" });
  await expect(history).not.toContainText("recorded a run");
  await history.getByRole("button", { name: "Tests", exact: true }).click();
  await expect(history).not.toContainText("recorded a run");
  await history.getByRole("button", { name: "All", exact: true }).click();
  const row = history
    .locator(".history-timeline > li")
    .filter({ hasText: "Codex recorded a run" });
  await expect(row.locator(".history-usage")).toHaveText(
    /^gpt-6\.1-sol · high · 12K input · 3K output · 2 min$/,
  );
  await expect(row).toContainText("First run");
  await request.post("/api/v1/items/HISTUSE-1/usage", {
    data: { total_tokens: 90000, context_tokens: 45000 },
    headers: { "X-Pano-Actor": "claude" },
  });
  const withContext = history
    .locator(".history-timeline > li")
    .filter({ hasText: "Claude recorded a run" });
  await expect(withContext.locator(".history-usage")).toHaveText(
    /^90K tokens · 45K context$/,
  );
});

test("history initially shows 50 of 205 records and loads more", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "HISTPAGE", name: "Sayfalama" },
  });
  await request.post("/api/v1/projects/HISTPAGE/items", {
    data: { title: "Long history" },
  });
  for (let i = 0; i < 205; i++)
    await request.post("/api/v1/items/HISTPAGE-1/records", {
      data: { kind: "note", message: `Record ${i}` },
    });
  await page.goto("/projects/HISTPAGE");
  await page.locator(".board-card").filter({ hasText: "Long history" }).click();
  await page.getByRole("tab", { name: "History" }).click();
  const rows = page.locator(".history-timeline > li");
  await expect(rows).toHaveCount(50, { timeout: 15000 });
  await expect(rows.first()).toContainText("Record 204");
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(rows).toHaveCount(100, { timeout: 15000 });
});

test("live events during loading do not cancel Load more", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "HISTLIVE", name: "Live history" },
  });
  for (const title of ["Long history", "Other item"])
    await request.post("/api/v1/projects/HISTLIVE/items", { data: { title } });
  for (let i = 0; i < 55; i++)
    await request.post("/api/v1/items/HISTLIVE-1/records", {
      data: { kind: "note", message: `Record ${i}` },
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
  await page.locator(".board-card").filter({ hasText: "Long history" }).click();
  await page.getByRole("tab", { name: "History" }).click();
  const rows = page.locator(".history-timeline > li");
  await expect(rows).toHaveCount(50);
  const nextPage = page.waitForRequest("**/activity?limit=50&offset=50*");
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await nextPage;
  // Any write produces an event; wait until the page has refreshed because of it.
  const refreshed = page.waitForResponse("**/api/v1/projects?*");
  await request.post("/api/v1/items/HISTLIVE-2/records", {
    data: { kind: "note", message: "Other record" },
  });
  await refreshed;
  release();
  await expect(rows.filter({ hasText: "Record 0" })).toHaveCount(1);
});
