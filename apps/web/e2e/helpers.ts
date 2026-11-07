import type { Page } from "@playwright/test";

/**
 * Parallel tests share one database, so any of them can add or reorder projects
 * at any moment. A test that measures, hovers or counts on the project list or
 * the sidebar shows only its own projects; everything else stays the real server.
 */
export async function onlyProjects(page: Page, ...keys: string[]) {
  await page.route("**/api/v1/projects?*", async (route) => {
    try {
      const response = await route.fetch();
      const projects: { key: string }[] = await response.json();
      await route.fulfill({
        response,
        json: projects.filter((project) => keys.includes(project.key)),
      });
    } catch {
      // Usually the test ended with this request still on its way. A real
      // failure reaches the page as a failed request and fails the test there.
      await route.abort().catch(() => {});
    }
  });
}
