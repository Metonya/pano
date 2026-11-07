import { stripTrailingSlashes } from "@pano/core/url";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export function client(env: NodeJS.ProcessEnv, fetcher: Fetch) {
  const base = stripTrailingSlashes(env.PANO_URL || "http://127.0.0.1:7777");
  return async (
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> => {
    const headers: Record<string, string> = {};
    if (env.PANO_TOKEN) headers.Authorization = `Bearer ${env.PANO_TOKEN}`;
    if (env.PANO_ACTOR) headers["X-Pano-Actor"] = env.PANO_ACTOR;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let response: Response;
    try {
      response = await fetcher(`${base}/api/v1${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new Error(
        `Sunucuya bağlanılamadı (${base}); pano serve ile başlat.`,
      );
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error?.message || `HTTP ${response.status}`);
    }
    return data;
  };
}
export type Client = ReturnType<typeof client>;
export const segment = (value: string) => encodeURIComponent(value);
