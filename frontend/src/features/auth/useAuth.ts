import { useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { demoMode } from "../../shared/config";
import { demoEmployees, demoProfile } from "../../shared/demo/data";
import {
  type DocumentType,
  type EmployeeProfile,
  type Role,
} from "../../shared/types";

export function useAuth() {
  const [user, setUser] = useState<EmployeeProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(!demoMode);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    api.setUnauthorizedHandler(() => setUser(null));
    if (demoMode) return;
    let alive = true;
    api
      .refreshSession()
      .then((session) => {
        if (alive && session) setUser(session.employee);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setAuthLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function signIn(input: {
    documentType: DocumentType;
    documentNumber: string;
    password: string;
    rememberMe: boolean;
  }) {
    setAuthError("");
    if (demoMode) {
      setUser({ ...demoProfile });
      return;
    }
    try {
      const session = await api.login(input);
      setUser(session.employee);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión.",
      );
      throw error;
    }
  }

  function signInDemo() {
    setUser({ ...demoProfile });
    setAuthError("");
  }

  function changeDemoRole(role: Role) {
    if (!demoMode || !user) return;
    const employee =
      role === "system_admin"
        ? demoEmployees[3]
        : role === "sales_advisor"
          ? demoEmployees[1]
          : demoEmployees[0];
    setUser({ ...employee });
  }

  async function signOut() {
    if (!demoMode) {
      try {
        await api.logout();
      } catch {
        /* A local sign out must still complete. */
      }
    }
    api.setToken(null);
    setUser(null);
  }

  return {
    user,
    setUser,
    authLoading,
    authError,
    signIn,
    signInDemo,
    changeDemoRole,
    signOut,
  };
}
