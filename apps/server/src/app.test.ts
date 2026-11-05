import { expect, test } from "bun:test";
import { version } from "../../../package.json";
import { app } from "./app";

test("health returns the root package version", async () => {
  const response = await app.request("/api/v1/health");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, version });
});
