import { expect, test } from "@playwright/test";
import { onlyProjects } from "./helpers";

test("project can be created, starred, archived and restored", async ({
  page,
}) => {
  await onlyProjects(page, "DP");
  await page.goto("/");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByLabel("Project name").fill("Demo project");
  await expect(page.getByLabel("Key", { exact: true })).toHaveCount(0);
  await expect(page.getByText("PBIs are numbered DP-1, DP-2")).toBeVisible();
  await page.getByRole("button", { name: "Create" }).click();
  const card = page.locator("article").filter({ hasText: "Demo project" });
  await expect(card).toBeVisible();
  await expect(
    card.getByRole("link", { name: "Demo project" }),
  ).toHaveAttribute("href", "/projects/DP");
  await card.getByRole("button", { name: "Star Demo project" }).click();
  await expect(
    card.getByRole("button", { name: "Remove star Demo project" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    card.getByRole("button", { name: "Remove star Demo project" }),
  ).toBeVisible();
  await card.getByRole("button", { name: "More actions Demo project" }).click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: /^Archive/ }).click();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "More actions Demo project" }).click();
  await page.getByRole("menuitem", { name: "Restore" }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  if (!box) throw new Error("Project card is not visible");
  await page.mouse.click(box.x + 30, box.y + box.height - 15);
  await expect(page).toHaveURL(/\/projects\/DP$/);
});

test("project settings save the name, enforce rules and archive with inline confirmation", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "SETTING", name: "Settings test" },
  });
  await page.request.post("/api/v1/projects/SETTING/items", {
    data: { title: "Waiting in Test" },
  });
  await page.request.patch("/api/v1/items/SETTING-1", {
    data: { status: "test" },
  });
  await page.goto("/projects/SETTING");
  const openSettings = () =>
    page.getByRole("button", { name: "Project settings" }).click();
  const dialog = page.getByRole("dialog");
  await openSettings();
  await expect(page.getByLabel("Key", { exact: true })).toHaveJSProperty(
    "readOnly",
    true,
  );
  await expect(page.getByLabel("Key", { exact: true })).toHaveValue("SETTING");
  const save = page.getByRole("button", { name: "Save", exact: true });

  // Closing the Test column needs a destination for the waiting card.
  await page.getByRole("switch", { name: "Test column" }).click();
  await expect(save).toBeDisabled();
  await page.getByLabel("Where should Test cards move?").selectOption("done");
  await expect(save).toBeEnabled();

  // Test and AI cannot both be off.
  await page.getByRole("switch", { name: "AI can move to Done" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "AI must be allowed to move to Done when Test is disabled.",
  );
  await expect(save).toBeDisabled();
  await page.getByRole("switch", { name: "AI can move to Done" }).click();
  await page.getByRole("switch", { name: "Test column" }).click();

  await page.getByLabel("Project name").fill("New settings name");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByText("You have unsaved changes", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await save.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".toolbar h1")).toHaveText("New settings name");

  await openSettings();
  await page.getByRole("button", { name: "Archive project…" }).click();
  await expect(page.getByText("Archive this project?")).toBeVisible();
  await expect(
    page.getByText(
      "The board leaves the list; you can restore it from Archive.",
    ),
  ).toBeVisible();
  await expect(save).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("button", { name: "Archive project…" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Archive project…" }).click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/");
  await expect(page.locator("aside")).not.toContainText("New settings name");
});

test("project descriptions can be saved and cleared; empty cards show no placeholder", async ({
  page,
}) => {
  await onlyProjects(page, "DESCR");
  await page.request.post("/api/v1/projects", {
    data: { key: "DESCR", name: "Description test" },
  });
  await page.request.post("/api/v1/projects/DESCR/star", {
    data: { starred: true },
  });
  await page.goto("/");
  const card = page.locator("article").filter({ hasText: "Description test" });
  const description = card.locator(".description");
  const settings = async () => {
    await card
      .getByRole("button", { name: "More actions Description test" })
      .click();
    await page.getByRole("menuitem", { name: "Project settings" }).click();
  };
  const dialog = page.getByRole("dialog");
  const field = dialog.getByLabel("Description", { exact: true });
  const save = dialog.getByRole("button", { name: "Save", exact: true });

  await expect(card).toBeVisible();
  await expect(description).toHaveCount(0);
  await expect(card).not.toContainText("No description");
  const emptyHeight = (await card.boundingBox())?.height ?? 0;

  await settings();
  await expect(field).toHaveValue("");
  await field.fill("Shared team board");
  // An unsaved description counts as a change.
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByText("You have unsaved changes", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await save.click();
  await expect(dialog).toHaveCount(0);
  await expect(description).toHaveText("Shared team board");
  expect((await card.boundingBox())?.height ?? 0).toBeGreaterThan(emptyHeight);

  await settings();
  await expect(field).toHaveValue("Shared team board");
  await field.fill("");
  await save.click();
  await expect(dialog).toHaveCount(0);
  await expect(description).toHaveCount(0);
  await expect(card).not.toContainText("No description");
  expect((await card.boundingBox())?.height).toBe(emptyHeight);
  const saved = await page.request.get("/api/v1/projects/DESCR");
  expect((await saved.json()).description).toBe("");
});

test("PBIs without a description retain the heading and Edit without a placeholder", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "EMPTYPBI", name: "Empty PBI" },
  });
  await page.request.post("/api/v1/projects/EMPTYPBI/items", {
    data: { title: "Item without description" },
  });
  await page.goto("/projects/EMPTYPBI");
  await page
    .locator(".board-card")
    .filter({ hasText: "Item without description" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Description", exact: true }),
  ).toBeVisible();
  await expect(dialog).not.toContainText("No description");
  await expect(
    dialog
      .locator(".sheet-section")
      .filter({ has: page.getByRole("heading", { name: "Description" }) })
      .getByRole("button", { name: "Edit" }),
  ).toBeVisible();
});

test("card menu opens settings on the current page and keeps starring on the card", async ({
  page,
}) => {
  await onlyProjects(page, "MENU");
  await page.request.post("/api/v1/projects", {
    data: { key: "MENU", name: "Menu test" },
  });
  await page.goto("/");
  const card = page.locator("article").filter({ hasText: "Menu test" });
  const menu = page.getByRole("menu");
  const trigger = card.getByRole("button", {
    name: "More actions Menu test",
  });

  await trigger.click();
  await expect(menu.getByRole("menuitem").first()).toHaveText(
    "Project settings",
  );
  await expect(
    menu.getByRole("menuitem", { name: /Star|Remove star/ }),
  ).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "Archive" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);

  // The right-click menu has the same content.
  await card.click({ button: "right", position: { x: 30, y: 30 } });
  await expect(menu.getByRole("menuitem").first()).toHaveText(
    "Project settings",
  );
  await expect(
    menu.getByRole("menuitem", { name: /Star|Remove star/ }),
  ).toHaveCount(0);

  await menu.getByRole("menuitem", { name: "Project settings" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Key", { exact: true })).toHaveValue("MENU");
  await expect(page).toHaveURL("/");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/");
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");

  // The star button on the card still works.
  await card.getByRole("button", { name: "Star Menu test" }).click();
  await expect(
    card.getByRole("button", { name: "Remove star Menu test" }),
  ).toBeVisible();

  // An archived project has no settings entry.
  await trigger.click();
  await menu.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: /^Archive/ }).click();
  await trigger.click();
  await expect(menu.getByRole("menuitem", { name: "Restore" })).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Project settings" }),
  ).toHaveCount(0);
});

test("large card footer keeps relative date and active agent count on one line", async ({
  page,
}) => {
  await onlyProjects(page, "AGZERO", "AGTWO");
  for (const [key, name] of [
    ["AGZERO", "Card without agents"],
    ["AGTWO", "Card with two agents"],
  ] as const) {
    await page.request.post("/api/v1/projects", { data: { key, name } });
    await page.request.post(`/api/v1/projects/${key}/star`, {
      data: { starred: true },
    });
  }
  // Three items, two different agents; the person does not count.
  for (const assignee of ["claude:a", "claude:a", "codex:b", "mert"]) {
    const created = await page.request.post("/api/v1/projects/AGTWO/items", {
      data: { title: `Item ${assignee}` },
    });
    await page.request.patch(`/api/v1/items/${(await created.json()).key}`, {
      data: { status: "in_progress", assignee },
    });
  }
  await page.goto("/");
  const zero = page
    .locator("article")
    .filter({ hasText: "Card without agents" });
  const two = page
    .locator("article")
    .filter({ hasText: "Card with two agents" });
  const accent = await page.evaluate(() => {
    const probe = document.createElement("i");
    probe.style.color = "var(--accent)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });

  await expect(two.locator(".foot-agents")).toHaveText("Active agents: 2");
  await expect(two.locator(".foot-dot")).toHaveCSS("background-color", accent);
  await expect(zero.locator(".foot-agents")).toHaveText("Active agents: 0");
  await expect(zero.locator(".foot-dot")).not.toHaveCSS(
    "background-color",
    accent,
  );
  await expect(zero).not.toContainText("No agents");

  const updatedAt = (
    await (await page.request.get("/api/v1/projects/AGTWO")).json()
  ).updated_at as string;
  const time = two.locator(".card-foot time");
  await expect(two.locator(".foot-updated")).toHaveText("Updated just now");
  await expect(time).toHaveAttribute("datetime", updatedAt);
  await expect(time).toHaveAttribute("title", /2\d{3}/);

  for (const width of [1440, 375, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const foot = await two.locator(".card-foot").evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      padding: Number.parseFloat(getComputedStyle(el).paddingTop),
      fits: el.scrollWidth <= el.clientWidth,
    }));
    expect(foot.fits).toBe(true);
    // Border, padding and one 13px line: a second line would add about 20px.
    expect(foot.height - foot.padding).toBeLessThan(26);
    const single = await time.evaluate(
      (el) =>
        el.getClientRects().length === 1 &&
        el.scrollWidth <= el.clientWidth + 1,
    );
    expect(single).toBe(true);
  }

  // The whole card still opens the board.
  await page.setViewportSize({ width: 1440, height: 800 });
  const foot = await two.locator(".foot-agents").boundingBox();
  if (!foot) throw new Error("Agent indicator is not visible");
  await page.mouse.click(foot.x + 4, foot.y + 4);
  await expect(page).toHaveURL(/\/projects\/AGTWO$/);
});

test("active agent count groups three Claude roles and Codex into two tools", async ({
  page,
}) => {
  await onlyProjects(page, "AGROLE");
  await page.request.post("/api/v1/projects", {
    data: { key: "AGROLE", name: "Card with roles" },
  });
  await page.request.post("/api/v1/projects/AGROLE/star", {
    data: { starred: true },
  });
  for (const assignee of [
    "claude:identity",
    "claude:kullanim",
    "claude:po",
    "codex",
    "mert",
  ]) {
    const created = await page.request.post("/api/v1/projects/AGROLE/items", {
      data: { title: `Item ${assignee}` },
    });
    await page.request.patch(`/api/v1/items/${(await created.json()).key}`, {
      data: { status: "in_progress", assignee },
    });
  }
  await page.goto("/");
  const card = page.locator("article").filter({ hasText: "Card with roles" });
  await expect(card.locator(".foot-agents")).toHaveText("Active agents: 2");
  const saved = await page.request.get("/api/v1/projects");
  const project = (await saved.json()).find(
    (entry: { key: string }) => entry.key === "AGROLE",
  );
  expect(project.agents).toBe(2);
});

test("compact card buttons take no space and appear on hover and Tab", async ({
  page,
}) => {
  await onlyProjects(page, "COMPACT");
  const name = "Compact card with a very long name ".repeat(4).trim();
  await page.request.post("/api/v1/projects", {
    data: { key: "COMPACT", name },
  });
  await page.request.post("/api/v1/projects/COMPACT/items", {
    data: { title: "Open item" },
  });
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/");
  await page.mouse.move(0, 0);
  const card = page.locator("article").filter({ hasText: "Compact card" });
  const link = card.getByRole("link");
  const star = card.getByRole("button", { name: /^Star / });
  const more = card.getByRole("button", { name: /^More actions / });
  const info = card.locator(".card-info");

  await expect(info).toContainText("1 open items");
  await expect(info.locator("time")).toHaveText("just now");
  await expect(info.locator("time")).toHaveAttribute("title", /2\d{3}/);
  expect((await info.boundingBox())?.height).toBeLessThan(24);
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "0");
  const rest = await card.boundingBox();
  // The title runs under the hidden buttons up to the card's padding.
  const title = await card.locator("h3").boundingBox();
  expect((title?.x ?? 0) + (title?.width ?? 0)).toBeCloseTo(
    (rest?.x ?? 0) + (rest?.width ?? 0) - 25,
    0,
  );

  await card.hover();
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "1");
  for (const button of [star, more]) {
    const box = await button.boundingBox();
    expect(box?.width).toBe(28);
    expect(box?.height).toBe(28);
  }
  expect((await card.boundingBox())?.height).toBe(rest?.height);

  // Stays visible while its menu is open, even with the pointer gone.
  await more.click();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(more).toBeFocused();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "0");

  // Reachable by keyboard: hidden with opacity, not removed.
  await link.focus();
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Tab");
  await expect(star).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(more).toBeFocused();

  // Touch size and always visible on the narrow layout, next to the text.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.setViewportSize({ width: 375, height: 812 });
  await page.mouse.move(0, 0);
  await expect(card.locator(".card-actions")).toHaveCSS("opacity", "1");
  for (const button of [star, more]) {
    const box = await button.boundingBox();
    expect(box?.width).toBe(44);
    expect(box?.height).toBe(44);
  }
  const titleBox = await card.locator(".project-title").boundingBox();
  const starBox = await star.boundingBox();
  expect((titleBox?.x ?? 0) + (titleBox?.width ?? 0)).toBeLessThanOrEqual(
    starBox?.x ?? 0,
  );
  await expect(info.locator("time")).toHaveText("just now");
  expect(
    await info
      .locator("time")
      .evaluate((el) => el.getBoundingClientRect().right),
  ).toBeLessThanOrEqual(starBox?.x ?? 0);
});

test.describe("long translations", () => {
  test.use({ locale: "de-DE" });
  test("number labels and footer fit without overflow", async ({ page }) => {
    await onlyProjects(page, "DEUTSCH");
    await page.request.post("/api/v1/projects", {
      data: { key: "DEUTSCH", name: "Deutsche Karte" },
    });
    await page.request.post("/api/v1/projects/DEUTSCH/star", {
      data: { starred: true },
    });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    const card = page.locator("article").filter({ hasText: "Deutsche Karte" });
    await expect(card.locator(".foot-agents")).toHaveText("Aktive Agents: 0");
    for (const area of [".counts", ".card-foot"]) {
      const fits = await card
        .locator(area)
        .evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(fits).toBe(true);
    }
    const labels = card.locator(".counts span");
    for (let i = 0; i < 4; i += 1) {
      expect((await labels.nth(i).boundingBox())?.height).toBeLessThan(22);
    }
    // The time stays whole; only the label before it may give way.
    const time = card.locator(".card-foot time");
    const agents = await card.locator(".foot-agents").boundingBox();
    expect(
      await time.evaluate((el) => el.getBoundingClientRect().right),
    ).toBeLessThanOrEqual(agents?.x ?? 0);
  });
});

test("sidebar lists starred projects first and highlights the active project", async ({
  page,
}) => {
  await onlyProjects(page, "SIDEA", "SIDEB");
  await page.request.post("/api/v1/projects", {
    data: { key: "SIDEA", name: "Unstarred sidebar" },
  });
  await page.request.post("/api/v1/projects", {
    data: { key: "SIDEB", name: "Starred sidebar" },
  });
  await page.request.post("/api/v1/projects/SIDEB/star", {
    data: { starred: true },
  });
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/projects/SIDEA");
  const sidebar = page.locator("aside");
  await expect(
    sidebar.locator(".nav-label", { hasText: "Starred" }),
  ).toHaveCount(0);
  const links = sidebar.locator("a.nav-project").filter({ hasText: "sidebar" });
  const rows = sidebar
    .locator(".nav-project-row")
    .filter({ hasText: "sidebar" });
  await expect(links.nth(0)).toContainText("Starred sidebar");
  await expect(
    rows.nth(0).getByRole("button", { name: "Remove star" }),
  ).toBeVisible();
  await expect(rows.nth(1).getByRole("button", { name: "Star" })).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(links.nth(1)).toHaveAttribute("aria-current", "page");
  await expect(rows.nth(1)).toHaveClass(/is-active/);
  await expect(links.nth(0)).not.toHaveAttribute("aria-current", "page");

  // The sidebar stays full height and pinned; a long page scrolls inside main.
  await page.evaluate(() => {
    document.querySelector(".content")?.append(
      Object.assign(document.createElement("div"), {
        style: "height: 2000px; flex-shrink: 0",
      }),
    );
    document.querySelector(".content")?.scrollTo(0, 1000);
    window.scrollTo(0, 1000);
  });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator(".toolbar")).toBeInViewport();
  const box = await sidebar.boundingBox();
  expect(box?.y).toBe(0);
  expect(box?.height).toBe(600);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("sidebar starring moves a project to the top without navigating", async ({
  page,
}) => {
  await onlyProjects(page, "STARZ", "STARB");
  await page.request.post("/api/v1/projects", {
    data: { key: "STARZ", name: "Stop one" },
  });
  // Newer and earlier in key order, so it starts above the project to star.
  await page.request.post("/api/v1/projects", {
    data: { key: "STARB", name: "Stop two" },
  });
  await page.goto("/waiting");
  const sidebar = page.locator("aside");
  const pair = sidebar.locator(".nav-project-row").filter({ hasText: "Stop" });
  const row = pair.filter({ hasText: "Stop one" });
  await expect(pair.first()).toContainText("Stop two");
  const button = row.locator("button.nav-star");
  await expect(row.locator("a button")).toHaveCount(0);

  // Hidden until the row is hovered, then a real click target.
  await expect(button).toHaveCSS("opacity", "0");
  await row.hover();
  await expect(button).toHaveCSS("opacity", "1");
  const box = await button.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(28);
  expect(box?.height).toBeGreaterThanOrEqual(28);
  await expect(button).toHaveAccessibleName("Star: Stop one");
  await expect(button).toHaveAttribute("aria-pressed", "false");

  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toHaveAccessibleName("Remove star: Stop one");
  await expect(page).toHaveURL("/waiting");
  await expect(pair.first()).toContainText("Stop one");
  // Stays visible without hover.
  await page.mouse.move(800, 400);
  await expect(button).toHaveCSS("opacity", "1");
  await page.reload();
  await expect(pair.first()).toContainText("Stop one");

  // Removing the star again keeps the page too.
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(page).toHaveURL("/waiting");

  // Touch size on the narrow layout.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Open menu" }).click();
  const mobile = await button.boundingBox();
  expect(mobile?.width).toBeCloseTo(44, 1);
  expect(mobile?.height).toBeCloseTo(44, 1);
});

test("Waiting for you lists oldest items first and opens cards directly", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "WAIT", name: "Waiting test" },
  });
  for (const title of ["Sent later", "Sent earlier"])
    await page.request.post("/api/v1/projects/WAIT/items", {
      data: { title, priority: "high" },
    });
  const send = (key: string) =>
    page.request.patch(`/api/v1/items/${key}`, {
      data: { status: "test", assignee: "mert" },
      headers: { "X-Pano-Actor": "claude:po" },
    });
  const firstSent = await (await send("WAIT-2")).json();
  const firstMove = firstSent.activity.find(
    (entry: { kind: string }) => entry.kind === "moved",
  );
  expect(firstMove).toBeDefined();
  await expect
    .poll(() => Date.now())
    .toBeGreaterThan(Date.parse(firstMove.created_at));
  await send("WAIT-1");
  await page.request.post("/api/v1/items/WAIT-2/scenarios", {
    data: { steps_md: "Open", expected_md: "Opens", author: "claude:po" },
    headers: { "X-Pano-Actor": "claude:po" },
  });
  await page.goto("/waiting");
  await expect(page.getByText(/Items waiting for your test\./)).toContainText(
    "items · oldest first",
  );
  const group = page
    .locator(".waiting-group")
    .filter({ hasText: "Waiting test" });
  await expect(group.locator(".waiting-group-head")).toContainText("2 items");
  const rows = group.getByRole("link");
  await expect(rows.nth(0)).toContainText("WAIT-2");
  await expect(rows.nth(0)).toContainText("High");
  await expect(rows.nth(0)).toContainText("1 scenario · Claude · PO");
  await expect(rows.nth(1)).toContainText("WAIT-1");
  await expect(rows.nth(1)).not.toContainText("scenario");
  await rows.nth(0).click();
  await expect(page).toHaveURL("/projects/WAIT");
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Sent earlier" }),
  ).toBeVisible();
});

test("mobile has no horizontal overflow and follows the dark system theme", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg")
        .trim(),
    ),
  ).toBe("#000");
});
