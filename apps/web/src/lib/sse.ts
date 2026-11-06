import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { queryKey } from "./api";
export function useProjectEvents() {
  const qc = useQueryClient();
  const [connection, setConnection] = useState(true);
  useEffect(() => {
    const refresh = () => {
      void qc.invalidateQueries({ queryKey });
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["item"] });
    };
    function connect() {
      const stream = new EventSource("/api/v1/events");
      for (const event of [
        "project.created",
        "project.updated",
        "item.created",
        "item.updated",
        "item.moved",
        "item.check",
        "item.criterion_added",
        "item.seen",
        "item.assigned",
        "item.edited",
        "item.cancelled",
      ])
        stream.addEventListener(event, refresh);
      stream.onopen = () => {
        setConnection(true);
        refresh();
      };
      stream.onerror = () => setConnection(false);
      return stream;
    }
    let stream = connect();
    const retry = () => {
      stream.close();
      stream = connect();
    };
    window.addEventListener("pano:retry-connection", retry);
    return () => {
      window.removeEventListener("pano:retry-connection", retry);
      stream.close();
    };
  }, [qc]);
  return connection;
}
