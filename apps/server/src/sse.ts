import type { ChangeEvent, Core } from "@pano/core";
export function eventsResponse(
  core: Core,
  projectKey: string | undefined,
  signal: AbortSignal,
) {
  const project = projectKey ? core.projects.get(projectKey) : undefined;
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      const listener = (event: ChangeEvent) => {
        if (!project || event.projectId === project.id)
          send(
            `event: ${event.itemId ? "item" : "project"}.${event.kind === "created" ? "created" : event.kind === "moved" ? "moved" : "updated"}\ndata: ${JSON.stringify(event)}\n\n`,
          );
      };
      const timer = setInterval(() => send(": heartbeat\n\n"), 15000);
      cleanup = () => {
        clearInterval(timer);
        core.events.off("change", listener);
        signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      };
      core.events.on("change", listener);
      signal.addEventListener("abort", abort, { once: true });
      send(": connected\n\n");
      if (signal.aborted) abort();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
