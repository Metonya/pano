import { app } from "./app";

export default {
  hostname: "127.0.0.1",
  port: Number(process.env.PANO_PORT ?? 7777),
  fetch: app.fetch,
};
