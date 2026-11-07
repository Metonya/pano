import { expect, test } from "@playwright/test";

test("human testing, send-back and approval", async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
  const post = (path: string, data: object, actor = "codex") =>
    request.post(`/api/v1${path}`, {
      data,
      headers: { "X-Pano-Actor": actor },
    });
  expect(
    (await post("/projects", { key: "HUMAN", name: "Human testing" })).ok(),
  ).toBeTruthy();
  await post("/projects/HUMAN/items", {
    title: "Item to test",
    assignee: "codex",
  });
  await post("/items/HUMAN-1/scenarios", {
    steps_md: "Open the page",
    expected_md: "Visible",
    author: "codex",
  });
  await request.patch("/api/v1/items/HUMAN-1", {
    data: {
      status: "test",
      assignee: "mert",
      what_changed_md: "Screen changed",
      how_to_test_md: "Open the page",
    },
    headers: { "X-Pano-Actor": "codex" },
  });
  await page.goto("/waiting");
  await expect(page.getByText("HUMAN-1")).toBeVisible();
  await page.getByRole("link", { name: /Item to test/ }).click();
  await expect(page.getByLabel("Steps", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "AI checks" })).toHaveCount(0);
  // The card shows the expected text alone; only screen readers get the label.
  const firstCard = page.locator(".test-scenario").first();
  const expectedRow = firstCard.locator(".test-expected");
  await expect(expectedRow).toContainText("Visible");
  await expect(expectedRow.locator(".sr-only")).toHaveText("Expected result:");
  const label = await expectedRow.locator(".sr-only").boundingBox();
  expect(label?.width).toBeLessThanOrEqual(1);
  await expect(expectedRow.locator(".markdown")).toHaveCSS("font-size", "13px");
  const stepsBox = await firstCard
    .getByText("Open the page", { exact: true })
    .boundingBox();
  const expectedBox = await expectedRow.getByText("Visible").boundingBox();
  expect(expectedBox?.y ?? 0).toBeGreaterThanOrEqual(
    (stepsBox?.y ?? 0) + (stepsBox?.height ?? 0),
  );
  await page.getByRole("button", { name: "Add scenario", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add", exact: true }).first(),
  ).toBeDisabled();
  await page.getByLabel("Steps", { exact: true }).fill("Second scenario");
  await page
    .getByLabel("Expected result", { exact: true })
    .fill("Second result");
  await page
    .locator(".test-panel")
    .getByRole("button", { name: "Add", exact: true })
    .click();
  // The saved card can appear just before the form closes, with the same text.
  await expect(
    page.locator(".test-scenario p", { hasText: "Second scenario" }),
  ).toBeVisible();
  await expect(page.getByLabel("Steps", { exact: true })).toHaveCount(0);
  await page
    .getByRole("group", { name: /1: Open the page/ })
    .getByRole("button", { name: "Failed" })
    .click();
  // A failed scenario asks for its own note; the composer stays closed.
  const sendBackForm = page.getByRole("form", {
    name: "Send back",
    exact: true,
  });
  const failedCard = page
    .locator(".test-scenario")
    .filter({ hasText: "Open the page" });
  const scenarioNote = failedCard.getByLabel("Scenario note");
  await expect(scenarioNote).toBeVisible();
  await expect(scenarioNote).toHaveAttribute("placeholder", "What happened?");
  await expect(sendBackForm).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reassign back" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Send back", exact: true }),
  ).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
  await expect(page.locator(".test-actions .test-primary")).toHaveText(
    "Send back",
  );
  await expect(page.locator(".test-actions")).toContainText("Failed scenarios");
  // Without a scenario note, the general note is required.
  await page.locator(".test-actions .test-primary").click();
  await expect(sendBackForm).toBeVisible();
  expect(
    await page
      .locator(".sheet-body")
      .evaluate((body) => body.scrollWidth <= body.clientWidth),
  ).toBe(true);
  const submit = sendBackForm.getByRole("button", {
    name: "Send back",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await expect(sendBackForm).toContainText("Required.");
  await sendBackForm.getByRole("button", { name: "Cancel" }).click();
  // Leaving Failed hides the note; returning brings it back.
  await scenarioNote.fill("Title misaligned");
  await failedCard.getByRole("button", { name: "Failed" }).click();
  await expect(scenarioNote).toHaveCount(0);
  await failedCard.getByRole("button", { name: "Failed" }).click();
  await expect(scenarioNote).toHaveValue("Title misaligned");
  // A scenario note is enough; the composer lists what failed.
  await page.locator(".test-actions .test-primary").click();
  await expect(sendBackForm).toContainText("Scenario 1 (Open the page)");
  await expect(sendBackForm).toContainText("Title misaligned");
  await expect(sendBackForm).toContainText("a general note is optional");
  await expect(submit).toBeEnabled();
  await page
    .getByLabel("Send-back note", { exact: true })
    .fill("Appearance incorrect");
  const png = (name: string) => ({
    name,
    mimeType: "image/png",
    buffer: Buffer.from("89504e470d0a1a0a", "hex"),
  });
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toHaveAttribute("multiple", "");
  await fileInput.setInputFiles([png("screen.png"), png("second.png")]);
  await expect(sendBackForm.locator(".test-attachments img")).toHaveCount(2);
  await expect(sendBackForm.locator(".test-attachments img").first()).toHaveCSS(
    "width",
    "120px",
  );
  const remove = sendBackForm.getByRole("button", {
    name: "Remove attachment: second.png",
  });
  await expect(remove).toHaveCSS("height", "24px");
  await remove.click();
  await expect(sendBackForm.locator(".test-attachments img")).toHaveCount(1);
  // The drop zone stays; a bad file reports an error and keeps the others.
  await fileInput.setInputFiles([
    { name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("x") },
    png("third.png"),
  ]);
  await expect(page.locator(".test-actions [role=alert]")).toContainText(
    "note.txt",
  );
  await expect(sendBackForm.locator(".test-attachments img")).toHaveCount(2);
  await submit.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const returned = await (await request.get("/api/v1/items/HUMAN-1")).json();
  expect(returned.return_note).toBe(
    "Appearance incorrect\n\nScenario 1 (Open the page): Title misaligned",
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
  await page.getByText("Item to test", { exact: true }).first().click();
  // Asking for In Progress from the status menu takes the same send-back path.
  await page.getByRole("button", { name: /^Status/ }).click();
  await page.getByRole("menuitemradio", { name: "In Progress" }).click();
  await expect(sendBackForm).toBeVisible();
  await sendBackForm.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    (await (await request.get("/api/v1/items/HUMAN-1")).json()).status,
  ).toBe("done");
});

test("scenarios edit inline, delete with inline confirmation and accept a scenario note alone", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
  const headers = { "X-Pano-Actor": "codex" };
  await request.post("/api/v1/projects", {
    data: { key: "SCENE", name: "Scenario test" },
    headers,
  });
  await request.post("/api/v1/projects/SCENE/items", {
    data: { title: "Scenario item", assignee: "codex" },
    headers,
  });
  for (const steps_md of ["First step", "Second step", "Third step"])
    await request.post("/api/v1/items/SCENE-1/scenarios", {
      data: { steps_md, expected_md: "Olur", author: "codex" },
      headers,
    });
  await request.patch("/api/v1/items/SCENE-1", {
    data: { status: "test", assignee: "mert" },
    headers,
  });
  await page.goto("/projects/SCENE");
  await page.getByText("Scenario item", { exact: true }).first().click();
  const card = (text: string) =>
    page.locator(".test-scenario").filter({ hasText: text });
  const menu = (text: string) =>
    card(text).getByRole("button", { name: "More actions" });
  // Result buttons stay on the row; edit and delete live in the menu.
  await expect(
    card("First step").getByRole("button", { name: "Passed" }),
  ).toBeVisible();
  await expect(card("First step").locator(".test-icon")).toHaveCount(1);

  // Edit in place: the card becomes the form, not the end of the list.
  await menu("Second step").click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const form = page.locator(".test-scenario form");
  await expect(form).toHaveCount(1);
  // A filled textarea's text counts as label text, so match by label start.
  const stepsField = form.getByLabel(/^Steps/);
  await expect(stepsField).toHaveValue("Second step");
  await expect(stepsField).toBeFocused();
  await expect(form).not.toContainText("To add");
  await expect(
    page.locator(".test-scenario").nth(1).locator("form"),
  ).toHaveCount(1);
  await stepsField.fill("New step");
  await form.getByRole("button", { name: "Cancel" }).click();
  await expect(card("Second step")).toBeVisible();
  await menu("Second step").click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await stepsField.fill("New step");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(card("New step")).toBeVisible();
  await expect(form).toHaveCount(0);

  // Delete asks inside the card without opening another dialog.
  await menu("Third step").click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();
  const confirm = card("Third step").getByRole("group", {
    name: "Delete this scenario?",
  });
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page.locator(".test-scenario")).toHaveCount(3);
  await menu("Third step").click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();
  await confirm.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".test-scenario")).toHaveCount(2);

  // Only scenario notes: no general note, no attachments.
  await card("New step").getByRole("button", { name: "Failed" }).click();
  await card("New step").getByLabel("Scenario note").fill("Did not open");
  await card("First step").getByRole("button", { name: "Failed" }).click();
  await expect(card("First step").getByLabel("Scenario note")).toBeVisible();
  await page.locator(".test-actions .test-primary").click();
  await page
    .getByRole("form", { name: "Send back", exact: true })
    .getByRole("button", { name: "Send back", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const returned = await (await request.get("/api/v1/items/SCENE-1")).json();
  expect(returned.return_note).toBe(
    "Scenario 1 (First step)\nScenario 2 (New step): Did not open",
  );
});

test("test panel hides empty fields, edits markdown and separates AI checks", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
  const headers = { "X-Pano-Actor": "codex" };
  await request.post("/api/v1/projects", {
    data: { key: "PANEL", name: "Panel test" },
    headers,
  });
  await request.post("/api/v1/projects/PANEL/items", {
    data: {
      title: "Panel appearance",
      criteria: ["Criterion check"],
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
  await page.getByText("Panel appearance", { exact: true }).first().click();
  const panel = page.locator(".test-panel");
  await expect(
    panel.getByRole("heading", { name: "What changed", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("heading", { name: "How to test", exact: true }),
  ).toHaveCount(0);
  await expect(panel.getByRole("heading", { name: "AI checks" })).toHaveCount(
    0,
  );
  await panel
    .getByRole("button", { name: "What changed", exact: true })
    .click();
  await panel
    .getByLabel("What changed", { exact: true })
    .fill("**Appearance fixed**");
  await panel.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel.locator("strong")).toHaveText("Appearance fixed");
  await panel.getByRole("button", { name: "Edit", exact: true }).click();
  await panel.locator("textarea").fill("");
  await panel.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "What changed", exact: true }),
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
  await page.getByText("Panel appearance", { exact: true }).first().click();
  await expect(panel.locator(".test-checks li")).toHaveCount(2);
  await expect(panel.locator(".test-check-passed")).toContainText(
    "Passed: Unit 18/18 passed",
  );
  await expect(panel.locator(".test-check-failed")).toContainText(
    "Failed: Build failed",
  );
  const approve = page.getByRole("button", { name: "Approve", exact: true });
  await expect(approve).toHaveCSS("min-height", "36px");
  await expect(approve).toHaveCSS("border-radius", "10px");
  await expect(approve).toHaveCSS("background-color", "rgb(0, 113, 227)");
  await expect(page.locator(".test-actions")).toHaveCSS("position", "sticky");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await request.patch("/api/v1/items/PANEL-1", {
    data: { status: "in_progress", reason: "Panel check" },
    headers,
  });
  await page.reload();
  await page.getByText("Panel appearance", { exact: true }).first().click();
  await expect(panel).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Acceptance criteria", exact: true }),
  ).toBeVisible();
});
