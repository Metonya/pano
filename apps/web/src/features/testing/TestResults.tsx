import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Minus, X } from "lucide-react";
import { useId, useState } from "react";
import { AgentAvatar } from "@/features/agents/AgentAvatar";
import { agentName, type Detail } from "@/features/board/types";
import { date, request } from "@/lib/api";
import { t } from "@/lib/i18n";
import { AiCheckList, useAiChecks } from "./AiChecks";
import { Markdown } from "./TestPanel";
import "./testing.css";

type Entry = Detail["activity"][number];
type Scenario = Detail["scenarios"][number];

const PAGE = 200;
const isApproval = (entry: Entry) => entry.kind === "approved";

/** The history filter cannot ask for approvals, so this walks back until it finds one. */
async function latestApproval(itemKey: string): Promise<Entry | null> {
  for (let offset = 0; ; offset += PAGE) {
    const page: Entry[] = await request(
      `/items/${itemKey}/activity?limit=${PAGE}&offset=${offset}`,
    );
    const approval = page.find(isApproval);
    if (approval || page.length < PAGE) return approval ?? null;
  }
}

function Outcome({
  id,
  result,
}: Readonly<{ id: string; result: Scenario["result"] }>) {
  if (result === "pending")
    return (
      <span id={id} className="test-results-outcome test-check-unknown">
        <Minus size={14} aria-hidden="true" />
        {t("scenarioNotRun")}
      </span>
    );
  const passed = result === "passed";
  return (
    <span
      id={id}
      className={`test-results-outcome test-check-${passed ? "passed" : "failed"}`}
    >
      {passed ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <X size={14} aria-hidden="true" />
      )}
      {t(passed ? "scenarioPassed" : "scenarioFailed")}
    </span>
  );
}

function ScenarioResult({
  scenario,
  number,
}: Readonly<{ scenario: Scenario; number: number }>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <li className="test-results-row">
      <div className="test-results-head">
        <span id={`${id}-number`} className="test-scenario-number">
          {number}
        </span>
        <div id={`${id}-steps`} className="test-results-steps">
          <Markdown>{scenario.steps_md}</Markdown>
        </div>
        <Outcome id={`${id}-outcome`} result={scenario.result} />
        {/* Covers the whole row, and is not a wrapper: a button cannot hold markdown. */}
        <button
          type="button"
          className="test-results-toggle"
          aria-expanded={open}
          aria-controls={`${id}-expected`}
          aria-labelledby={`${id}-number ${id}-steps ${id}-outcome`}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <div
        id={`${id}-expected`}
        className="test-expected test-results-expected"
        hidden={!open}
      >
        <span className="sr-only">{t("scenarioExpected")}:</span>
        <Markdown>{scenario.expected_md}</Markdown>
      </div>
    </li>
  );
}

/** What testing found, kept readable once the card has left Test. Changes nothing. */
export function TestResults({
  itemKey,
  detail,
  onShowHistory,
}: Readonly<{
  itemKey: string;
  detail: Detail;
  onShowHistory: () => void;
}>) {
  const id = useId();
  const outsideTest = detail.status !== "test";
  const checks = useAiChecks(itemKey, outsideTest);
  const { scenarios } = detail;
  const visible = outsideTest && (scenarios.length > 0 || checks.length > 0);
  // Later records push an approval out of the few the detail response carries.
  const recentApproval = detail.activity.find(isApproval);
  const olderApproval = useQuery<Entry | null>({
    queryKey: ["item", itemKey, "activity", "latest-approval"],
    queryFn: () => latestApproval(itemKey),
    enabled: visible && !recentApproval,
  });
  if (!visible) return null;
  const approval = recentApproval ?? olderApproval.data;
  const passed = scenarios.filter((s) => s.result === "passed").length;
  return (
    <section className="sheet-section test-results" aria-labelledby={id}>
      <div className="sheet-section-heading">
        <h3 id={id}>{t("testResults")}</h3>
        {!!scenarios.length && (
          <span className="test-results-count">
            {t("testResultsPassed")
              .replace("{passed}", String(passed))
              .replace("{total}", String(scenarios.length))}
          </span>
        )}
      </div>
      {!!scenarios.length && (
        <ol className="test-results-list">
          {scenarios.map((scenario, index) => (
            <ScenarioResult
              key={scenario.id}
              scenario={scenario}
              number={index + 1}
            />
          ))}
        </ol>
      )}
      {!!checks.length && (
        <div className="test-results-checks">
          <h4>{t("aiChecks")}</h4>
          <AiCheckList checks={checks} />
        </div>
      )}
      {approval && (
        <p className="test-results-approval">
          <span>{t("testResultsLastApproval")}</span>
          <span className="test-results-actor">
            <AgentAvatar id={approval.actor} />
            <strong title={approval.actor}>{agentName(approval.actor)}</strong>
          </span>
          <time dateTime={approval.created_at}>
            {date(approval.created_at)}
          </time>
        </p>
      )}
      <button type="button" className="sheet-link" onClick={onShowHistory}>
        {t("showAllHistory")}
      </button>
    </section>
  );
}
