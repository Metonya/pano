import { EventEmitter } from "node:events";

export type { ChangeEvent } from "./types";
export function createEvents() {
  return new EventEmitter();
}
