import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { queryKey } from "./api";
export function useProjectEvents() {
  const qc = useQueryClient();
  const [connection, setConnection] = useState(true);
  useEffect(() => {
    const stream = new EventSource("/api/v1/events");
    const refresh = () => {
      void qc.invalidateQueries({ queryKey });
    };
    for (const event of [
      "project.created",
      "project.updated",
      "item.created",
      "item.updated",
      "item.moved",
    ])
      stream.addEventListener(event, refresh);
    stream.onopen = () => {
      setConnection(true);
      refresh();
    };
    stream.onerror = () => setConnection(false);
    return () => stream.close();
  }, [qc]);
  return connection;
}
