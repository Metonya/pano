import { Agent } from "node:http";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.PANO_PORT ?? 7777}`,
        // Without keep-alive every request leaves a closed socket holding a
        // local port for two minutes; Windows runs out of ports and writes fail.
        agent: new Agent({ keepAlive: true }),
      },
    },
  },
});
