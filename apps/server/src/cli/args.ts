import { parseArgs } from "node:util";

export const common = {
  json: { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const;

export function parse(
  args: string[],
  options: Record<
    string,
    { type: "string" | "boolean"; multiple?: boolean }
  > = {},
) {
  const result = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    tokens: true,
    options: { ...common, ...options },
  });
  return {
    ...result,
    values: result.values as Record<
      string,
      string | boolean | string[] | undefined
    >,
  };
}

export function requireArgs(args: string[], count: number, usage: string) {
  if (args.length !== count || args.some((arg) => !arg.trim()))
    throw new Error(`Usage: pano ${usage}`);
}
