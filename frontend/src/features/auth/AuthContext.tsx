import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../shared/api/api";
import { refreshSession, setSessionLostHandler } from "../../shared/api/client";
import { session, useSessionEmployee } from "../../shared/api/session";
import type { DocumentType, Profile } from "../../shared/api/types";

type Status = "loading" | "anonymous" | "authenticated" | "expired";
interface AuthValue {
  status: Status;
  user: Profile | null;
  login: (b: { documentType: DocumentType; documentNumber: string; password: string; rememberMe: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  /** For when the server already ended the session (for example after a password change). */
  endSession: () => void;
}
const Ctx = createContext<AuthValue | null>(null);
export const useAuth = () => { const v = useContext(Ctx); if (!v) throw new Error("AuthProvider missing"); return v; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSessionEmployee();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const lastUserId = useRef<string | null>(null);
  if (user) lastUserId.current = user.id;

  // On every page load the access token is gone (memory only), so ask for a new one with the refresh cookie.
  useEffect(() => {
    let alive = true;
    refreshSession().then((ok) => { if (alive) setStatus(ok ? "authenticated" : "anonymous"); });
    return () => { alive = false; };
  }, []);

  // When a request cannot renew the session, keep the screen (and typed data) and ask for the password again.
  useEffect(() => {
    setSessionLostHandler(() => setStatus((s) => (s === "authenticated" ? "expired" : s)));
    return () => setSessionLostHandler(null);
  }, []);

  const value: AuthValue = {
    status, user,
    async login(b) {
      const r = await authApi.login(b);
      if (lastUserId.current && lastUserId.current !== r.employee.id) qc.clear();
      session.set(r);
      setStatus("authenticated");
    },
    async logout() {
      try { await authApi.logout(); } catch { /* the cookie may already be gone */ }
      session.clear(); qc.clear(); lastUserId.current = null; setStatus("anonymous");
    },
    endSession() { session.clear(); qc.clear(); lastUserId.current = null; setStatus("anonymous"); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
