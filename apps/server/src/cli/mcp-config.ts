import { stripTrailingSlashes } from "@pano/core/url";

export function mcpConfig(target: string, env: NodeJS.ProcessEnv) {
  const url = `${stripTrailingSlashes(env.PANO_URL || "http://127.0.0.1:7777")}/mcp`;
  switch (target) {
    case "claude": {
      const authorization = `Authorization: Bearer ${env.PANO_TOKEN}`;
      const header = env.PANO_TOKEN
        ? ` --header ${JSON.stringify(authorization)}`
        : "";
      return `claude mcp add --transport http pano ${JSON.stringify(url)}${header}`;
    }
    case "codex":
      return `[mcp_servers.pano]\nurl = ${JSON.stringify(url)}${env.PANO_TOKEN ? '\nbearer_token_env_var = "PANO_TOKEN"' : ""}`;
    case "cursor":
      return JSON.stringify(
        {
          mcpServers: {
            pano: {
              url,
              ...(env.PANO_TOKEN
                ? { headers: { Authorization: `Bearer ${env.PANO_TOKEN}` } }
                : {}),
            },
          },
        },
        null,
        2,
      );
    default:
      throw new Error("Usage: pano mcp-config <claude|codex|cursor>");
  }
}
