import { expect, test } from "bun:test";
import { createApp, createCore } from "../app";

test("settings accept all 14 UI languages and reject unsupported codes", async () => {
  const core = createCore(":memory:");
  try {
    const app = createApp({ core, dataDir: "test" });
    const patch = (language: string) =>
      app.request("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
    for (const language of [
      "en",
      "tr",
      "az",
      "zh",
      "hi",
      "es",
      "de",
      "fr",
      "pt",
      "ja",
      "nl",
      "ko",
      "sv",
      "pl",
    ]) {
      expect((await patch(language)).status).toBe(200);
      expect(
        await (await app.request("/api/v1/settings")).json(),
      ).toMatchObject({ language });
    }
    expect((await patch("ru")).status).toBe(400);
  } finally {
    core.close();
  }
});
