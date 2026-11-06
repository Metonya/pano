import { useEffect, useState } from "react";
import type { Project } from "@/lib/api";
import { t } from "@/lib/i18n";
import { relativeTime } from "./format";
import type { BoardItem } from "./types";
export function BoardSummary({
  items,
  project,
}: {
  items: BoardItem[];
  project: Project;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const active = items.filter((i) => i.status !== "cancelled");
  const done = active.filter((i) => i.status === "done").length;
  const last =
    items
      .map((i) => i.last_activity)
      .filter(Boolean)
      .sort()
      .at(-1) ?? project.updated_at;
  return (
    <div className="board-summary">
      <span className="track">
        <span
          style={{
            width: `${active.length ? (done / active.length) * 100 : 0}%`,
          }}
        />
      </span>
      <span>
        {active.length - done} {t("remaining")} ·{" "}
        {new Date(project.created_at).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
        })}{" "}
        {t("started")} ·{" "}
        {
          active.filter((i) => i.priority === "high" && i.status !== "done")
            .length
        }{" "}
        {t("highPriority")} · {t("updated")} {relativeTime(last, now)}
      </span>
    </div>
  );
}
