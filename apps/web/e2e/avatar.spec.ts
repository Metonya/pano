import { expect, type Locator, type Page, test } from "@playwright/test";
import { onlyProjects } from "./helpers";

const TOOLS = ["claude", "codex", "cursor", "gemini", "copilot", "opencode"];
/** One device pixel of rounding on each side stays within the half pixel goal. */
const LIMIT = 0.5;

/**
 * How far the logo's white pixels sit from the circle's own painted pixels, in CSS
 * pixels. Only a picture shows this: the browser snaps an svg to whole pixels after
 * layout, so getBoundingClientRect reports a perfect centre either way.
 */
async function paintedOffset(page: Page, avatar: Locator) {
  await avatar.scrollIntoViewIfNeeded();
  const { x, y, background } = await avatar.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      background: getComputedStyle(el).backgroundColor,
    };
  });
  const clip = {
    x: Math.floor(x) - 3,
    y: Math.floor(y) - 3,
    width: 24,
    height: 24,
  };
  const picture = await page.screenshot({ clip, animations: "disabled" });
  return page.evaluate(
    async ({ base64, background }) => {
      const image = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${base64}`)).blob(),
      );
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No canvas");
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, image.width, image.height).data;
      const scale = image.width / 24;
      const color = (background.match(/\d+/g) ?? []).map(Number);
      const channel = (index: number, offset: number) =>
        data[index + offset] as number;
      const base = (offset: number) => color[offset] as number;
      const box = () => ({ x0: 1e9, x1: -1, y0: 1e9, y1: -1 });
      const grow = (b: ReturnType<typeof box>, px: number, py: number) => {
        b.x0 = Math.min(b.x0, px);
        b.x1 = Math.max(b.x1, px + 1);
        b.y0 = Math.min(b.y0, py);
        b.y1 = Math.max(b.y1, py + 1);
      };
      const circle = box();
      for (let py = 0; py < image.height; py++)
        for (let px = 0; px < image.width; px++) {
          const index = (py * image.width + px) * 4;
          const distance = Math.hypot(
            channel(index, 0) - base(0),
            channel(index, 1) - base(1),
            channel(index, 2) - base(2),
          );
          if (distance < 24) grow(circle, px, py);
        }
      const centerX = (circle.x0 + circle.x1) / 2;
      const centerY = (circle.y0 + circle.y1) / 2;
      const white = box();
      for (let py = 0; py < image.height; py++)
        for (let px = 0; px < image.width; px++) {
          if (Math.hypot(px + 0.5 - centerX, py + 0.5 - centerY) > 7 * scale)
            continue;
          const index = (py * image.width + px) * 4;
          const coverage =
            [0, 1, 2]
              .map(
                (offset) =>
                  (channel(index, offset) - base(offset)) /
                  (255 - base(offset)),
              )
              .reduce((sum, value) => sum + value, 0) / 3;
          if (coverage > 0.5) grow(white, px, py);
        }
      return {
        x: ((white.x0 + white.x1) / 2 - centerX) / scale,
        y: ((white.y0 + white.y1) / 2 - centerY) / scale,
        width: (white.x1 - white.x0) / scale,
      };
    },
    { base64: picture.toString("base64"), background },
  );
}

async function expectCentred(page: Page, avatar: Locator, where: string) {
  // Menus open with a zoom, which scales everything measured below.
  await avatar.waitFor();
  await page.evaluate(() =>
    Promise.allSettled(document.getAnimations().map((a) => a.finished)),
  );
  const layout = await avatar.evaluate((el) => {
    const circle = el.getBoundingClientRect();
    const logo = el.querySelector("svg")?.getBoundingClientRect();
    if (!logo) throw new Error("No logo");
    return {
      x: logo.x + logo.width / 2 - (circle.x + circle.width / 2),
      y: logo.y + logo.height / 2 - (circle.y + circle.height / 2),
      inset: (circle.width - logo.width) / 2,
    };
  });
  expect(Math.abs(layout.x), `${where} layout x`).toBeLessThan(0.01);
  expect(Math.abs(layout.y), `${where} layout y`).toBeLessThan(0.01);
  // A half pixel inset is what made the browser snap the logo off centre.
  expect(Number.isInteger(layout.inset), `${where} inset`).toBe(true);
  const painted = await paintedOffset(page, avatar);
  expect(painted.width, `${where} has white pixels`).toBeGreaterThan(5);
  expect(Math.abs(painted.x), `${where} painted x`).toBeLessThanOrEqual(LIMIT);
  expect(Math.abs(painted.y), `${where} painted y`).toBeLessThanOrEqual(LIMIT);
}

async function expectBesideText(holder: Locator, where: string) {
  const offset = await holder.evaluate((el) => {
    const avatar = el.querySelector(".assignee-avatar");
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let text = walker.nextNode();
    while (text && !text.textContent?.trim()) text = walker.nextNode();
    if (!avatar || !text) throw new Error("No avatar or text");
    const range = document.createRange();
    range.selectNodeContents(text);
    const a = avatar.getBoundingClientRect();
    const t = range.getBoundingClientRect();
    return a.y + a.height / 2 - (t.y + t.height / 2);
  });
  expect(Math.abs(offset), `${where} avatar beside text`).toBeLessThanOrEqual(
    LIMIT,
  );
}

for (const deviceScaleFactor of [1, 4]) {
  test.describe(`${deviceScaleFactor}x ekran`, () => {
    test.use({
      deviceScaleFactor,
      viewport: { width: 1400, height: 1200 },
    });

    test("logolar her kullanım yerinde dairenin ortasında, metinle aynı hizada", async ({
      page,
      request,
    }) => {
      const key = `LOGO${deviceScaleFactor}`;
      await request.post("/api/v1/projects", {
        data: { key, name: "Logolar" },
      });
      for (const [index, tool] of TOOLS.entries()) {
        await request.post(`/api/v1/projects/${key}/items`, {
          data: { title: `${tool} işi`, assignee: tool },
          headers: { "X-Pano-Actor": tool },
        });
        await request.post(`/api/v1/items/${key}-${index + 1}/move`, {
          data: { status: "in_progress" },
          headers: { "X-Pano-Actor": tool },
        });
      }
      await onlyProjects(page, key);
      await page.goto(`/projects/${key}`);

      for (const tool of TOOLS) {
        const chip = page
          .locator(".board-card")
          .filter({ hasText: `${tool} işi` })
          .locator(".assignee");
        await expectCentred(
          page,
          chip.locator(".assignee-avatar"),
          `kart ${tool}`,
        );
        await expectBesideText(chip, `kart ${tool}`);
        await expectCentred(
          page,
          page
            .locator(".agent-row")
            .filter({ hasText: new RegExp(tool, "i") })
            .locator(".assignee-avatar"),
          `sol panel ${tool}`,
        );
      }

      await page.getByRole("button", { name: /Filtre/ }).click();
      for (const tool of TOOLS)
        await expectCentred(
          page,
          page
            .getByRole("menuitemradio")
            .filter({ hasText: new RegExp(`^${tool}$`, "i") })
            .locator(".assignee-avatar"),
          `filtre ${tool}`,
        );
      await page.keyboard.press("Escape");

      for (const tool of TOOLS) {
        await page
          .locator(".board-card")
          .filter({ hasText: `${tool} işi` })
          .click();
        const chip = page.locator(".sheet-assignee");
        await expectCentred(
          page,
          chip.locator(".assignee-avatar"),
          `detay ${tool}`,
        );
        await expectBesideText(chip, `detay ${tool}`);
        await page.getByRole("button", { name: /^Atanan/ }).click();
        await expectCentred(
          page,
          page
            .getByRole("menuitemradio", { name: new RegExp(`^${tool}$`, "i") })
            .locator(".assignee-avatar"),
          `atanan ${tool}`,
        );
        await page.keyboard.press("Escape");
        await page.getByRole("tab", { name: "Geçmiş" }).click();
        await expectCentred(
          page,
          page.locator(".history-line .assignee-avatar").first(),
          `geçmiş ${tool}`,
        );
        await expectBesideText(
          page.locator(".history-line > div").first(),
          `geçmiş ${tool}`,
        );
        await page.keyboard.press("Escape");
        await expect(chip).toHaveCount(0);
      }
    });
  });
}
