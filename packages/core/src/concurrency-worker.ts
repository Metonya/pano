import { createCore } from "./index";

self.onmessage = (
  message: MessageEvent<{
    path: string;
    worker: number;
    barrier: SharedArrayBuffer;
  }>,
) => {
  const core = createCore(message.data.path);
  try {
    const barrier = new Int32Array(message.data.barrier);
    Atomics.add(barrier, 0, 1);
    Atomics.wait(barrier, 1, 0, 30000);
    if (Atomics.load(barrier, 1) !== 1)
      throw new Error("Worker barrier timed out");
    const numbers: number[] = [];
    for (let i = 0; i < 25; i++) {
      const item = core.items.create(
        "PANO",
        { title: `Worker ${message.data.worker} item ${i}` },
        "codex",
      );
      numbers.push(item.number);
    }
    self.postMessage({ numbers });
  } catch (error) {
    self.postMessage({ error: String(error) });
  } finally {
    core.close();
  }
};
