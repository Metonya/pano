import { FolderKanban, Inbox, WifiOff } from "lucide-react";
import { t } from "@/lib/i18n";
export function LoadingState() {
  return (
    <div className="state" aria-busy="true">
      {t("loading")}
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="state">
      <WifiOff />
      <h2>{t("error")}</h2>
      <p>{t("errorHelp")}</p>
      <button type="button" className="primary" onClick={retry}>
        {t("retry")}
      </button>
    </div>
  );
}
export function Placeholder({
  text,
  waiting = false,
}: {
  text: string;
  waiting?: boolean;
}) {
  return (
    <div className="state">
      {waiting ? <Inbox /> : <FolderKanban />}
      <h2>{text}</h2>
    </div>
  );
}
