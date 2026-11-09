import { useQuery } from "@tanstack/react-query";
import { Check, CircleAlert, X } from "lucide-react";
import { parseSnapshot } from "@/features/board/format";
import type { Detail } from "@/features/board/types";
import { checkResult } from "@/features/history/checkResult";
import { isLegacyCheck } from "@/features/history/entry";
import { request } from "@/lib/api";
import { t } from "@/lib/i18n";

type Entry = Detail["activity"][number];

/** The AI's own test records; the detail response only carries the latest few records. */
export function useAiChecks(itemKey: string, enabled: boolean): Entry[] {
  const records = useQuery<Entry[]>({
    queryKey: ["item", itemKey, "activity", "ai-checks"],
    queryFn: () => request(`/items/${itemKey}/activity?kind=check&limit=50`),
    enabled,
  });
  return (records.data ?? []).filter(
    (a) => a.message.trim() && !isLegacyCheck(a),
  );
}

export function AiCheckList({ checks }: Readonly<{ checks: Entry[] }>) {
  return (
    <ul className="test-checks">
      {checks.map((a) => {
        const result = checkResult(a.message, parseSnapshot(a.after_json));
        return (
          <li key={a.id} className={`test-check-${result}`}>
            {result === "passed" && <Check size={14} aria-hidden="true" />}
            {result === "failed" && <X size={14} aria-hidden="true" />}
            {result === "unknown" && (
              <CircleAlert size={14} aria-hidden="true" />
            )}
            <span>
              {result !== "unknown" &&
                `${t(result === "passed" ? "scenarioPassed" : "scenarioFailed")}: `}
              {a.message}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
