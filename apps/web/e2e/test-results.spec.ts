import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from "@playwright/test";

const headers = { "X-Pano-Actor": "codex" };

/** A project with one item in the wanted starting point, seeded through the API. */
async function seed(
  request: APIRequestContext,
  key: string,
  scenarios: { steps: string; expected: string }[],
) {
  await request.post("/api/v1/projects", {
    data: { key, name: `Results ${key}` },
    headers,
  });
  await request.post(`/api/v1/projects/${key}/items`, {
    data: { title: "Result card", assignee: "codex" },
    headers,
  });
  const itemKey = `${key}-1`;
  for (const { steps, expected } of scenarios)
    await request.post(`/api/v1/items/${itemKey}/scenarios`, {
      data: { steps_md: steps, expected_md: expected, author: "codex" },
      headers,
    });
  const item = await (await request.get(`/api/v1/items/${itemKey}`)).json();
  return {
    itemKey,
    ids: item.scenarios.map((s: { id: string }) => s.id) as string[],
  };
}

async function toTest(request: APIRequestContext, itemKey: string) {
  await request.patch(`/api/v1/items/${itemKey}`, {
    data: { status: "test", assignee: "mert" },
    headers,
  });
}

const mark = (
  request: APIRequestContext,
  itemKey: string,
  id: string,
  result: "passed" | "failed",
) =>
  request.patch(`/api/v1/items/${itemKey}/scenarios/${id}`, {
    data: { result },
  });

const check = (request: APIRequestContext, itemKey: string, message: string) =>
  request.post(`/api/v1/items/${itemKey}/records`, {
    data: { kind: "check", message },
    headers,
  });

/** Opens the card and waits until the AI records have arrived. */
async function open(page: Page, key: string) {
  await page.addInitScript(() => localStorage.setItem("pano-language", "en"));
  const records = page.waitForResponse(
    (response) =>
      response.url().includes(`/items/${key}-1/activity`) &&
      response.url().includes("kind=check"),
  );
  await page.goto(`/projects/${key}`);
  await page.getByText("Result card", { exact: true }).first().click();
  await records;
  await expect(
    page.getByRole("heading", { name: "Acceptance criteria", exact: true }),
  ).toBeVisible();
}

const section = (page: Page) =>
  page.getByRole("region", { name: "Test results", exact: true });

test("a Done card shows its results read-only", async ({ page, request }) => {
  const { itemKey, ids } = await seed(request, "RESDONE", [
    { steps: "Open **the** page", expected: "The page is visible" },
    { steps: "Press save", expected: "The change is kept" },
  ]);
  await toTest(request, itemKey);
  await mark(request, itemKey, ids[0] as string, "passed");
  await mark(request, itemKey, ids[1] as string, "passed");
  await check(request, itemKey, "Unit 18/18 passed");
  await check(request, itemKey, "Build failed");
  await request.post(`/api/v1/items/${itemKey}/approve`, {
    data: {},
    headers: { "X-Pano-Actor": "mert" },
  });
  // Enough later records to push the approval out of the detail response.
  for (let i = 0; i < 6; i++)
    await request.post(`/api/v1/items/${itemKey}/records`, {
      data: { kind: "note", message: `Later note ${i}` },
      headers,
    });
  const detail = await (await request.get(`/api/v1/items/${itemKey}`)).json();
  expect(detail.status).toBe("done");
  expect(
    detail.activity.some((a: { kind: string }) => a.kind === "approved"),
  ).toBe(false);

  await open(page, "RESDONE");
  const results = section(page);
  await expect(results).toBeVisible();
  await expect(results).toContainText("2 / 2 passed");
  await expect(results.locator(".test-results-row")).toHaveCount(2);
  await expect(
    results.locator(".test-results-row").first().locator("strong"),
  ).toHaveText("the");
  await expect(
    results.locator(".test-results-outcome.test-check-passed"),
  ).toHaveCount(2);

  // Between the criteria and the recent records.
  const order = await page
    .locator(".sheet-detail > section h3")
    .allTextContents();
  const place = order.indexOf("Test results");
  expect(order[place - 1]).toBe("Acceptance criteria");
  expect(order[place + 1]).toBe("Recent activity");

  // The expected result opens and closes, by pointer and by keyboard.
  const toggle = results.getByRole("button", { name: /Open the page/ });
  const expected = results.getByText("The page is visible");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(expected).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(expected).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(expected).toBeHidden();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(expected).toBeVisible();
  await page.keyboard.press("Space");
  await expect(expected).toBeHidden();

  // Read-only: the only controls are the rows and the history link.
  for (const name of ["Passed", "Failed", "Approve", "Edit", "Add scenario"])
    await expect(
      results.getByRole("button", { name, exact: true }),
    ).toHaveCount(0);
  await expect(results.locator("[aria-pressed]")).toHaveCount(0);
  await expect(results.locator("textarea, input")).toHaveCount(0);
  await expect(results.getByRole("button")).toHaveCount(3);

  // AI records keep the same presentation as in Test.
  await expect(results.locator(".test-checks li")).toHaveCount(2);
  await expect(results.locator(".test-check-passed").last()).toContainText(
    "Passed: Unit 18/18 passed",
  );
  await expect(
    results.locator(".test-checks .test-check-failed"),
  ).toContainText("Failed: Build failed");

  // The approval is found even though it left the latest records.
  const approval = results.locator(".test-results-approval");
  await expect(approval).toContainText("Last approval");
  await expect(approval.locator("strong")).toHaveAttribute("title", "mert");
  await expect(approval.locator("time")).toBeVisible();

  await results.getByRole("button", { name: "Show full history" }).click();
  await expect(page.getByRole("tab", { name: "History" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tab", { name: "History" })).toBeFocused();
  await expect(results).toBeHidden();
});

test("a sent-back In Progress card keeps its previous results", async ({
  page,
  request,
}) => {
  const { itemKey, ids } = await seed(request, "RESBACK", [
    { steps: "Works", expected: "Fine" },
    { steps: "Breaks", expected: "Should not break" },
    { steps: "Never tried", expected: "Unknown" },
  ]);
  await toTest(request, itemKey);
  await mark(request, itemKey, ids[0] as string, "passed");
  await mark(request, itemKey, ids[1] as string, "failed");
  await request.post(`/api/v1/items/${itemKey}/send-back`, {
    data: { note: "Second scenario broke" },
    headers: { "X-Pano-Actor": "mert" },
  });
  expect(
    (await (await request.get(`/api/v1/items/${itemKey}`)).json()).status,
  ).toBe("in_progress");

  await open(page, "RESBACK");
  const results = section(page);
  await expect(results).toContainText("1 / 3 passed");
  const row = (text: string) =>
    results.locator(".test-results-row").filter({ hasText: text });
  await expect(row("Works").locator(".test-results-outcome")).toHaveText(
    "Passed",
  );
  await expect(row("Breaks").locator(".test-results-outcome")).toHaveText(
    "Failed",
  );
  // Nobody marked it, so it must not read as a result.
  await expect(row("Never tried").locator(".test-results-outcome")).toHaveText(
    "Not run",
  );
  await expect(results.locator(".test-results-approval")).toHaveCount(0);
  await expect(page.locator(".test-panel")).toHaveCount(0);
});

test("a Test card does not repeat its results", async ({ page, request }) => {
  const { itemKey, ids } = await seed(request, "RESTEST", [
    { steps: "Open it", expected: "Opens" },
  ]);
  await toTest(request, itemKey);
  await mark(request, itemKey, ids[0] as string, "passed");
  await check(request, itemKey, "Unit 3/3 passed");

  await open(page, "RESTEST");
  await expect(page.locator(".test-scenario")).toHaveCount(1);
  await expect(page.locator(".test-checks li")).toHaveCount(1);
  await expect(section(page)).toHaveCount(0);
  await expect(page.getByText("Open it", { exact: true })).toHaveCount(1);
});

test("the section follows the records a card actually has", async ({
  page,
  request,
}) => {
  // AI records alone are enough, and there is no scenario count to show.
  const aiOnly = await seed(request, "RESAI", []);
  await check(request, aiOnly.itemKey, "Lint passed");
  await open(page, "RESAI");
  await expect(section(page)).toBeVisible();
  await expect(section(page).locator(".test-results-count")).toHaveCount(0);
  await expect(section(page).locator(".test-results-row")).toHaveCount(0);
  await expect(section(page).locator(".test-checks li")).toHaveText([
    "Passed: Lint passed",
  ]);

  // Neither scenarios nor AI records: no section, even on a Done card.
  const empty = await seed(request, "RESNONE", []);
  await request.patch(`/api/v1/items/${empty.itemKey}`, {
    data: { status: "done" },
    headers,
  });
  await open(page, "RESNONE");
  await expect(section(page)).toHaveCount(0);
});
