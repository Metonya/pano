export function mcpConfig(target: string, env: NodeJS.ProcessEnv) {
  const url = `${(env.PANO_URL || "http://127.0.0.1:7777").replace(/\/+$/, "")}/mcp`;
  switch (target) {
    case "claude":
      return `claude mcp add --transport http pano ${JSON.stringify(url)}${env.PANO_TOKEN ? ` --header ${JSON.stringify(`Authorization: Bearer ${env.PANO_TOKEN}`)}` : ""}`;
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
      throw new Error("Kullanım: pano mcp-config <claude|codex|cursor>");
  }
}
