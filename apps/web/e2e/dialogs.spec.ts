import { expect, test } from "@playwright/test";

test("Change reveals the key; manual edits persist and validation errors appear", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByLabel("Project name").fill("Example Project");
  await page.getByRole("button", { name: "Change" }).click();
  const key = page.getByLabel("Key", { exact: true });
  await key.fill("lowercase");
  await page.getByLabel("Project name").fill("Other name");
  await page.clock.fastForward(400);
  await expect(key).toHaveValue("lowercase");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Key must contain 2–10 uppercase letters or numbers.",
  );
  // Create the conflicting key in this test so it also runs independently.
  await page.request.post("/api/v1/projects", {
    data: { name: "Taken key", key: "TAKEN" },
  });
  await key.fill("TAKEN");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "This key is already in use.",
  );
  await key.fill("CUSTOM");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .locator("article")
      .filter({ hasText: "Other name" })
      .getByRole("link", { name: "Other name" }),
  ).toHaveAttribute("href", "/projects/CUSTOM");
});

test("empty and reset forms close; dirty forms ask through every closing path", async ({
  page,
}) => {
  await page.goto("/");
  const open = () =>
    page.getByRole("button", { name: "New project" }).first().click();
  const outside = () => page.mouse.click(5, 5);
  const dialog = page.getByRole("dialog");
  await open();
  await outside();
  await expect(dialog).toHaveCount(0);
  await open();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await open();
  await page.getByLabel("Project name").fill("Draft");
  for (const close of [
    outside,
    () => page.keyboard.press("Escape"),
    () => page.getByRole("button", { name: "Cancel" }).click(),
    () => page.getByRole("button", { name: "Close", exact: true }).click(),
  ]) {
    await dialog.evaluate((element) =>
      Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      ),
    );
    const before = await dialog.boundingBox();
    if (!before) throw new Error("Dialog is not visible");
    await close();
    const after = await dialog.boundingBox();
    if (!after) throw new Error("Dialog is not visible");
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    await expect(
      page.getByText("You have unsaved changes", { exact: true }),
    ).toBeVisible();
    await expect(dialog).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Keep editing" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByLabel("Project name")).toHaveValue("Draft");
  }
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Close without saving" }).click();
  await expect(dialog).toHaveCount(0);
  await open();
  await expect(page.getByLabel("Project name")).toHaveValue("");
  await page.getByLabel("Project name").fill("Undo");
  await page.getByLabel("Project name").fill("");
  await outside();
  await expect(dialog).toHaveCount(0);
});

test("permanent deletion blocks outside clicks; Escape and Cancel close without a prompt", async ({
  page,
}) => {
  await page.request.post("/api/v1/projects", {
    data: { key: "DEL", name: "Deletion test" },
  });
  await page.request.post("/api/v1/projects/DEL/archive", {
    data: { archived: true },
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Archive/ }).click();
  const open = async () => {
    await page
      .locator("article")
      .filter({ hasText: "Deletion test" })
      .getByRole("button", { name: "More actions Deletion test" })
      .click();
    await page
      .getByRole("menuitem", { name: "Delete permanently…", exact: true })
      .click();
  };
  await open();
  await page.getByLabel("Project name").fill("Deletion");
  await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("You have unsaved changes", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open();
  await page.getByLabel("Project name").fill("Deletion");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open();
  await expect(page.getByLabel("Project name")).toHaveValue("");
  await page.getByLabel("Project name").fill("Deletion");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Pano link opens the home page and closes the mobile menu", async ({
  page,
}) => {
  await page.goto("/waiting");
  const brand = page.getByRole("link", { name: "Pano", exact: true });
  await expect(brand).toHaveAttribute("href", "/");
  await brand.focus();
  await expect(brand).toBeFocused();
  await brand.press("Enter");
  await expect(page).toHaveURL("/");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/waiting");
  await page.getByRole("button", { name: "Open menu" }).click();
  await brand.click();
  await expect(page).toHaveURL("/");
  await expect(page.locator("aside")).not.toHaveClass(/mobile-open/);
});
