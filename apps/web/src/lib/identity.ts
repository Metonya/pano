import { useSyncExternalStore } from "react";

/** The person's name from the server, known before the first render when possible. */
let current: string | null = null;
const listeners = new Set<() => void>();

export const currentUser = () => current;

export function setCurrentUser(name: string | null) {
  if (name === current) return;
  current = name;
  for (const listener of listeners) listener();
}

export function useCurrentUser() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, currentUser);
}
