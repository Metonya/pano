import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authHeaders, getToken, queryKey, unauthorized } from "./api";

// One refresh refetches every project's board, so a burst of events must not
// trigger one refresh per event: that queues over 100 requests for each write.
const REFRESH_INTERVAL_MS = 300;
export function useProjectEvents() {
  const qc = useQueryClient();
  const [connection, setConnection] = useState(true);
  useEffect(() => {
    let controller: AbortController;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey });
      void qc.invalidateQueries({ queryKey: ["board"] });
      // A refetch would cancel a "load more" in flight and drop the click.
      void qc.invalidateQueries({
        queryKey: ["item"],
        predicate: (query) => !query.state.fetchMeta?.fetchMore,
      });
    };
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let lastRefresh = 0;
    // The first event refreshes at once; a burst collapses into one more.
    const scheduleRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(
        () => {
          refreshTimer = undefined;
          lastRefresh = Date.now();
          refresh();
        },
        Math.max(0, lastRefresh + REFRESH_INTERVAL_MS - Date.now()),
      );
    };
    async function connect() {
      controller = new AbortController();
      const signal = controller.signal;
      const token = getToken();
      try {
        const response = await fetch("/api/v1/events", {
          headers: authHeaders(token),
          signal,
        });
        if (response.status === 401) {
          unauthorized(token);
          return;
        }
        if (!response.ok || !response.body) throw new Error("SSE unavailable");
        setConnection(true);
        refresh();
        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split(/\r\n|\r|\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (/^event: ?(?:project|item)\./.test(line)) scheduleRefresh();
          }
        }
      } catch {
        if (signal.aborted) return;
      }
      if (!stopped && !signal.aborted) {
        setConnection(false);
        timer = setTimeout(() => void connect(), 3000);
      }
    }
    const retry = () => {
      controller.abort();
      clearTimeout(timer);
      void connect();
    };
    void connect();
    window.addEventListener("pano:retry-connection", retry);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(refreshTimer);
      controller.abort();
      window.removeEventListener("pano:retry-connection", retry);
    };
  }, [qc]);
  return connection;
}
