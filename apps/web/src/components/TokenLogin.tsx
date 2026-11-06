import { useState } from "react";
import { authHeaders, setToken } from "@/lib/api";
import { t } from "@/lib/i18n";

export function TokenLogin({ onSuccess }: { onSuccess: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/projects", {
        headers: authHeaders(value),
      });
      if (response.status === 401) setError(t("tokenInvalid"));
      else if (!response.ok) setError(t("failed"));
      else {
        setToken(value);
        onSuccess();
      }
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl bg-card p-6 shadow-card"
      >
        <h1 className="text-[22px] font-bold mb-6">{t("tokenTitle")}</h1>
        <label htmlFor="pano-token" className="block text-sm font-medium mb-2">
          {t("tokenTitle")}
        </label>
        <input
          id="pano-token"
          type="password"
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-md border border-line bg-card px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="primary mt-6">
          {t("continue")}
        </button>
      </form>
    </main>
  );
}
