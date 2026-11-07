import { expect, test } from "@playwright/test";

test("board respects reduced motion and remains keyboard draggable", async ({
  page,
  request,
}) => {
  await request.post("/api/v1/projects", {
    data: { key: "MOTION", name: "Hareket" },
  });
  await request.post("/api/v1/projects/MOTION/items", {
    data: { title: "Hareket işi" },
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/projects/MOTION");
  const card = page.locator(".board-card").filter({ hasText: "Hareket işi" });
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS("transition-duration", "0.12s, 0.12s");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).toHaveCSS("transition-property", "none");
  // dnd-kit can supply its own inline transition during sorting.
  await card.evaluate((element) => {
    element.style.transition = "transform 200ms ease";
  });
  await expect(card).toHaveCSS("transition-property", "none");
  await card.hover();
  await expect(card).toHaveCSS("translate", "none");
  await card.focus();
  await page.keyboard.press("Space");
  // The keyboard sensor exposes no reliable observable ready state, so these waits stay.
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/v1/items/MOTION-1")).json()).status,
    )
    .toBe("in_progress");
});
