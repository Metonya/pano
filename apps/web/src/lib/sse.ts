import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authHeaders, getToken, queryKey, unauthorized } from "./api";

const REFRESH_INTERVAL_MS = 300;
const REFRESH_LIMIT_MS = 5000;

/**
 * One refresh refetches every project's board, so a burst of events must not
 * trigger one refresh per event: that queues over 100 requests for each write.
 * A refresh also waits for the previous one, otherwise a slow server falls ever
 * further behind and the person's own saves wait at the end of that queue.
 * The first event refreshes at once; a burst collapses into one more. A request
 * that never answers holds live updates back only until `limitMs`.
 */
export function refreshScheduler(
  refresh: () => Promise<unknown>,
  intervalMs = REFRESH_INTERVAL_MS,
  limitMs = REFRESH_LIMIT_MS,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let limit: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let again = false;
  let stopped = false;
  let last = 0;
  const run = async () => {
    timer = undefined;
    running = true;
    last = Date.now();
    await Promise.race([
      refresh().catch(() => {}),
      new Promise((resolve) => {
        limit = setTimeout(resolve, limitMs);
      }),
    ]);
    clearTimeout(limit);
    running = false;
    if (again) {
      again = false;
      schedule();
    }
  };
  const schedule = () => {
    if (stopped || timer) return;
    if (running) {
      again = true;
      return;
    }
    timer = setTimeout(run, Math.max(0, last + intervalMs - Date.now()));
  };
  return {
    schedule,
    stop() {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(limit);
    },
  };
}

export function useProjectEvents() {
  const qc = useQueryClient();
  const [connection, setConnection] = useState(true);
  useEffect(() => {
    let controller: AbortController;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const refresh = () =>
      Promise.all([
        qc.invalidateQueries({ queryKey }),
        qc.invalidateQueries({ queryKey: ["board"] }),
        // A refetch would cancel a "load more" in flight and drop the click.
        qc.invalidateQueries({
          queryKey: ["item"],
          predicate: (query) => !query.state.fetchMeta?.fetchMore,
        }),
      ]);
    const refreshes = refreshScheduler(refresh);
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
        void refresh();
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
            if (/^event: ?(?:project|item)\./.test(line)) refreshes.schedule();
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
      refreshes.stop();
      controller.abort();
      window.removeEventListener("pano:retry-connection", retry);
    };
  }, [qc]);
  return connection;
}
