import { expect, test } from "bun:test";
import { refreshScheduler } from "./sse";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("the first event refreshes at once and a burst collapses into one more", async () => {
  let runs = 0;
  const refreshes = refreshScheduler(
    async () => {
      runs++;
    },
    30,
    1000,
  );
  refreshes.schedule();
  await wait(10);
  expect(runs).toBe(1);
  for (let i = 0; i < 20; i++) refreshes.schedule();
  await wait(60);
  expect(runs).toBe(2);
  refreshes.stop();
});

test("a slow refresh is not overlapped, and events during it are not lost", async () => {
  let runs = 0;
  let running = 0;
  let most = 0;
  const refreshes = refreshScheduler(
    async () => {
      runs++;
      most = Math.max(most, ++running);
      await wait(50);
      running--;
    },
    5,
    1000,
  );
  refreshes.schedule();
  await wait(15);
  refreshes.schedule();
  refreshes.schedule();
  expect(runs).toBe(1);
  await wait(130);
  expect(runs).toBe(2);
  expect(most).toBe(1);
  refreshes.stop();
});

test("a refresh that never answers or fails does not stop live updates", async () => {
  let runs = 0;
  const refreshes = refreshScheduler(
    () => {
      runs++;
      return runs === 1
        ? new Promise(() => {})
        : Promise.reject(new Error("x"));
    },
    1,
    20,
  );
  refreshes.schedule();
  await wait(5);
  refreshes.schedule();
  await wait(50);
  expect(runs).toBe(2);
  refreshes.schedule();
  await wait(15);
  expect(runs).toBe(3);
  refreshes.stop();
});

test("nothing runs after stop", async () => {
  let runs = 0;
  const refreshes = refreshScheduler(async () => {
    runs++;
  });
  refreshes.schedule();
  refreshes.stop();
  refreshes.schedule();
  await wait(10);
  expect(runs).toBe(0);
});
