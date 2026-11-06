import { expect, test } from "bun:test";
import { createCore } from "@pano/core";
import { createSystem } from "./system";

test("release checks detect updates and respect the disabled setting", async () => {
  const core = createCore(":memory:");
  let calls = 0;
  const mock = Object.assign(
    async () => {
      calls++;
      return Response.json({ tag_name: "v99.0.0" });
    },
    { preconnect: fetch.preconnect },
  ) as typeof fetch;
  const system = createSystem(core, ".", mock);
  await system.check();
  expect(system.info().updateAvailable).toBe(true);
  expect(system.info().latestVersion).toBe("v99.0.0");
  core.db.query("INSERT INTO settings VALUES ('updateCheck', 'false')").run();
  await system.check();
  expect(calls).toBe(1);
  core.close();
});
