import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authHeaders, getToken, queryKey, unauthorized } from "./api";
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
      void qc.invalidateQueries({ queryKey: ["item"] });
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
            if (/^event: ?(?:project|item)\./.test(line)) refresh();
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
      controller.abort();
      window.removeEventListener("pano:retry-connection", retry);
    };
  }, [qc]);
  return connection;
}
