import { z } from "zod";
export function positionBetween(before: number, after: number) {
  z.number().parse(before);
  z.number().parse(after);
  if (before >= after) throw new Error("Positions must be increasing");
  const middle = before + (after - before) / 2;
  if (middle <= before || middle >= after)
    throw new Error("No representable position between neighbours");
  return middle;
}
