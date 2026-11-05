import type { MiddlewareHandler } from "hono";
export function auth(token?: string): MiddlewareHandler {
  return async (c, next) => {
    if (
      token &&
      c.req.path !== "/api/v1/health" &&
      c.req.header("Authorization") !== `Bearer ${token}`
    )
      return c.json(
        { error: { code: "unauthorized", message: "Bearer token required" } },
        401,
      );
    await next();
  };
}
