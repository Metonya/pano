type Asset = { body: string; type: string };
type AssetGlobal = typeof globalThis & { panoAssets?: Record<string, Asset> };

export function staticResponse(request: Request): Response | undefined {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const path = new URL(request.url).pathname;
  if (/^\/(api|mcp)(\/|$)/.test(path)) return;
  const assets = (globalThis as AssetGlobal).panoAssets;
  if (!assets) return;
  const asset = assets[path] ?? assets["/index.html"];
  if (!asset) return;
  return new Response(
    request.method === "HEAD" ? null : Buffer.from(asset.body, "base64"),
    {
      headers: {
        "Content-Type": asset.type,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
