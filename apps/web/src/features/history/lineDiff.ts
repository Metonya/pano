export type DiffLine = { kind: "same" | "added" | "removed"; text: string };

// Hirschberg's LCS keeps memory linear even for long descriptions.
function lengths(a: string[], b: string[]): Uint32Array {
  let previous = new Uint32Array(b.length + 1);
  for (const line of a) {
    const current = new Uint32Array(b.length + 1);
    for (let j = 0; j < b.length; j++)
      current[j + 1] =
        line === b[j] ? previous[j] + 1 : Math.max(previous[j + 1], current[j]);
    previous = current;
  }
  return previous;
}

function lcs(a: string[], b: string[]): string[] {
  if (!a.length || !b.length) return [];
  if (a.length === 1) return b.includes(a[0]) ? [a[0]] : [];
  const middle = Math.floor(a.length / 2);
  const left = lengths(a.slice(0, middle), b);
  const right = lengths(a.slice(middle).reverse(), [...b].reverse());
  let split = 0;
  for (let j = 1; j <= b.length; j++)
    if (left[j] + right[b.length - j] > left[split] + right[b.length - split])
      split = j;
  return [
    ...lcs(a.slice(0, middle), b.slice(0, split)),
    ...lcs(a.slice(middle), b.slice(split)),
  ];
}

export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before === "" ? [] : before.replaceAll("\r\n", "\n").split("\n");
  const b = after === "" ? [] : after.replaceAll("\r\n", "\n").split("\n");
  const result: DiffLine[] = [];
  let i = 0,
    j = 0;
  for (const shared of lcs(a, b)) {
    while (a[i] !== shared) result.push({ kind: "removed", text: a[i++] });
    while (b[j] !== shared) result.push({ kind: "added", text: b[j++] });
    result.push({ kind: "same", text: shared });
    i++;
    j++;
  }
  while (i < a.length) result.push({ kind: "removed", text: a[i++] });
  while (j < b.length) result.push({ kind: "added", text: b[j++] });
  return result;
}
