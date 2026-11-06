import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Placeholder } from "@/components/States";
import type { Project } from "@/lib/api";
import { t } from "@/lib/i18n";
export function Waiting({ active }: { active: Project[] }) {
  const projects = active.filter((p) => p.waiting.length);
  return projects.length ? (
    projects.map((p) => (
      <section key={p.id}>
        <h2>{p.name}</h2>
        <div className="waiting-list">
          {p.waiting.map((item) => (
            <Link key={item.id} to={`/projects/${p.key}`}>
              <span>
                <b>
                  {p.key}-{item.number}
                </b>{" "}
                {item.title}
              </span>
              <ChevronRight size={18} />
            </Link>
          ))}
        </div>
      </section>
    ))
  ) : (
    <Placeholder waiting text={t("emptyWaiting")} />
  );
}
