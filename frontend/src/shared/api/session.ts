import { useSyncExternalStore } from "react";
import type { Profile, SessionResponse } from "./types";

// The access token lives only in memory (never localStorage). The refresh token is an HttpOnly cookie.
let token: string | null = null;
let employee: Profile | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const session = {
  get token() { return token; },
  get employee() { return employee; },
  set(d: SessionResponse) { token = d.accessToken; employee = d.employee; emit(); },
  clear() { token = null; employee = null; emit(); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};
export const useSessionEmployee = () => useSyncExternalStore(session.subscribe, () => employee);
