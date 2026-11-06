type Row = Record<string, unknown>;
const line = (value: unknown) =>
  String(value ?? "—")
    .replace(/[\r\n\t]/g, " ")
    .replaceAll(String.fromCharCode(27), " ");
export function table(rows: Row[], fields: string[]) {
  if (!rows.length) return "(boş)";
  const cells = [
    fields,
    ...rows.map((row) => fields.map((field) => line(row[field]))),
  ];
  const widths = fields.map((_, i) =>
    Math.max(...cells.map((row) => Array.from(row[i]).length)),
  );
  return cells
    .map((row) =>
      row
        .map(
          (cell, i) => cell + " ".repeat(widths[i] - Array.from(cell).length),
        )
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}
export function readable(data: unknown): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data))
    return table(data, ["key", "name", "starred", "archived_at"]);
  const row = data as Row;
  if (typeof row.added === "number" && typeof row.skipped === "number")
    return `${line(row.project)}: ${row.added} eklendi, ${row.skipped} atlandı.`;
  if (row.columns) {
    const columns = row.columns as Record<string, Row[]>;
    return Object.entries(columns)
      .map(
        ([name, rows]) =>
          `${name} (${rows.length})\n${table(rows, ["key", "title", "priority", "assignee"])}`,
      )
      .join("\n\n");
  }
  if (row.title) {
    const criteria = (row.criteria ?? []) as Row[];
    const activity = (row.activity ?? []) as Row[];
    const scenarios = (row.scenarios ?? []) as Row[];
    return [
      `${line(row.key)}  ${line(row.title)}`,
      `${line(row.status)} · ${line(row.priority)} · ${line(row.assignee)}`,
      row.body_md ? String(row.body_md) : "",
      ...criteria.map(
        (c) => `[${c.done ? "x" : " "}] ${line(c.id)}  ${line(c.text)}`,
      ),
      ...scenarios.map(
        (s) =>
          `${line(s.result)}  ${line(s.steps_md)} → ${line(s.expected_md)}`,
      ),
      ...activity.map(
        (entry) =>
          `${line(entry.created_at)}  ${line(entry.actor)}  ${line(entry.message)}`,
      ),
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (row.name) return table([row], ["key", "name", "starred", "archived_at"]);
  if (row.text)
    return `[${row.done ? "x" : " "}] ${line(row.id)}  ${line(row.text)}`;
  if (row.message) return line(row.message);
  return JSON.stringify(data, null, 2);
}
