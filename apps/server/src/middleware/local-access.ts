import type { MiddlewareHandler } from "hono";

// Tokenless servers only accept local hosts and same-origin browser requests.
// Docker must also publish its port on the host loopback interface.
export function localAccess(): MiddlewareHandler {
  return async (c, next) => {
    const host = c.req.header("host") ?? "";
    const validHost = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(host);
    const origin = c.req.header("origin");
    const fetchSite = c.req.header("sec-fetch-site");
    if (
      !validHost ||
      (origin !== undefined && origin !== `http://${host}`) ||
      (fetchSite !== undefined && !["same-origin", "none"].includes(fetchSite))
    ) {
      return c.json(
        { error: { code: "forbidden", message: "Local access only" } },
        403,
      );
    }
    await next();
  };
}
