import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Placeholder } from "@/components/States";
import { agentName } from "@/features/board/types";
import type { Project, WaitingItem } from "@/lib/api";
import { t } from "@/lib/i18n";

const itemCount = (count: number) =>
  t(count === 1 ? "waitingItemOne" : "waitingItemOther").replace(
    "{count}",
    String(count),
  );
const oldest = (project: Project) => project.waiting[0]?.sent_at ?? "";

function details(item: WaitingItem) {
  const parts: string[] = [];
  if (item.scenario_count)
    parts.push(
      t(
        item.scenario_count === 1
          ? "waitingScenarioOne"
          : "waitingScenarioOther",
      ).replace("{count}", String(item.scenario_count)),
    );
  if (item.sent_by) parts.push(agentName(item.sent_by));
  return parts.join(" · ");
}

export function Waiting({ active }: { active: Project[] }) {
  // The server lists each project's items oldest first.
  const projects = active
    .filter((p) => p.waiting.length)
    .sort((a, b) => oldest(a).localeCompare(oldest(b)));
  if (!projects.length)
    return (
      <Placeholder
        waiting
        text={t("emptyWaiting")}
        help={t("emptyWaitingHelp")}
      />
    );
  const total = projects.reduce((sum, p) => sum + p.waiting.length, 0);
  return (
    <div className="waiting-page">
      <p className="summary">
        {t("waitingHelp")} {itemCount(total)} · {t("waitingOldestFirst")}
      </p>
      {projects.map((p) => (
        <section key={p.id} className="waiting-group">
          <div className="waiting-group-head">
            <span className="small-icon" aria-hidden="true">
              {p.name[0]}
            </span>
            <h2>{p.name}</h2>
            <span>{itemCount(p.waiting.length)}</span>
          </div>
          <div className="waiting-list">
            {p.waiting.map((item) => {
              const meta = details(item);
              return (
                <Link
                  key={item.id}
                  to={`/projects/${p.key}?item=${item.number}`}
                >
                  <span className="waiting-row">
                    <span className="waiting-row-key">
                      <span>
                        {p.key}-{item.number}
                      </span>
                      {item.priority === "high" && (
                        <span className="waiting-high">{t("high")}</span>
                      )}
                      {item.priority === "low" && (
                        <span className="waiting-low">{t("low")}</span>
                      )}
                    </span>
                    <span className="waiting-row-title">{item.title}</span>
                    {meta && <span className="waiting-row-meta">{meta}</span>}
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
