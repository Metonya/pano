export function stripTrailingSlashes(value: string) {
  let end = value.length;
  while (end > 0 && value.codePointAt(end - 1) === 47) end--;
  return end === value.length ? value : value.slice(0, end);
}
