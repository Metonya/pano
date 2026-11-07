import { expect, test } from "@playwright/test";

test("token login and live updates", async ({ page, request }) => {
  await page.goto("/");
  await page.getByLabel("Pano Token").fill("wrong");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Pano Token").fill("test-token");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("button", { name: "New project" }).first(),
  ).toBeVisible();
  const stream = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/events"),
  );
  await page.reload();
  await stream;
  await expect(
    page.getByRole("button", { name: "New project" }).first(),
  ).toBeVisible();
  const response = await request.post(
    "http://127.0.0.1:17778/api/v1/projects",
    {
      headers: { Authorization: "Bearer test-token" },
      data: { key: "LIVE", name: "Live project" },
    },
  );
  expect(response.ok()).toBeTruthy();
  await expect(
    page.getByRole("link", { name: "Live project" }).first(),
  ).toBeVisible();
});
