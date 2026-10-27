import { type ReactNode } from "react";
import { demoMode } from "../../shared/config";
import { type EmployeeProfile, type Role } from "../../shared/types";
import { type View } from "../navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({
  children,
  page,
  user,
  query,
  setQuery,
  onNavigate,
  onSignOut,
  onRoleChange,
  mobileOpen,
  onMenuClick,
  onCloseMobile,
}: {
  children: ReactNode;
  page: View;
  user: EmployeeProfile;
  query: string;
  setQuery: (value: string) => void;
  onNavigate: (page: View) => void;
  onSignOut: () => void;
  onRoleChange: (role: Role) => void;
  mobileOpen: boolean;
  onMenuClick: () => void;
  onCloseMobile: () => void;
}) {
  return (
    <div className="app-layout">
      <Sidebar
        page={page}
        user={user}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        mobileOpen={mobileOpen}
        onClose={onCloseMobile}
      />
      <div className="app-main">
        <Topbar
          page={page}
          user={user}
          demo={demoMode}
          query={query}
          onQueryChange={setQuery}
          onRoleChange={onRoleChange}
          onNavigate={onNavigate}
          onMenuClick={onMenuClick}
        />
        <main className="page-content">{children}</main>
        <footer className="app-footer">
          <span>
            EndosoFlow <b>·</b> Grupo Pana
          </span>
          <span>
            Portal de colaboradores <b>·</b> Fase 1
          </span>
        </footer>
      </div>
    </div>
  );
}
