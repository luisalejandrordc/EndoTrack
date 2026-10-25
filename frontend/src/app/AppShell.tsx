import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { setMockActor } from "../mock/api";
import { oldestInflightMs } from "../shared/api/client";
import type { Profile } from "../shared/api/types";
import { initials } from "../shared/format";
import { roleLabel } from "../shared/labels";
import { Spinner } from "../shared/ui/ui";
import { useAuth } from "../features/auth/AuthContext";
import { ReloginModal } from "../features/auth/AuthPages";

/** Shows a calm explanation when the free hosting is slow to wake up. */
export function WakeBanner() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setSlow(oldestInflightMs() > 5000), 1000);
    return () => clearInterval(t);
  }, []);
  return slow ? (
    <div className="wake" role="status">
      El servidor se está iniciando, esto puede tardar unos segundos…
    </div>
  ) : null;
}

export function RequireAuth() {
  const { status, user } = useAuth();
  const loc = useLocation();
  const last = useRef<Profile | null>(null);
  if (user) last.current = user;
  setMockActor(last.current); // keeps the in-memory demo data tied to the signed-in employee
  if (status === "loading")
    return (
      <div className="boot">
        <Spinner label="Iniciando sesión…" />
      </div>
    );
  if (status === "anonymous")
    return (
      <Navigate
        to="/iniciar-sesion"
        replace
        state={{ from: loc.pathname + loc.search }}
      />
    );
  return <Shell user={last.current!} expired={status === "expired"} />;
}

function Shell({ user, expired }: { user: Profile; expired: boolean }) {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const items: [string, string][] = [
    ["/ventas", "Ventas"],
    ["/clientes", "Clientes"],
    ["/catalogo", "Catálogo"],
    ...(user.role === "system_admin"
      ? [["/empleados", "Empleados"] as [string, string]]
      : []),
    ["/perfil", "Mi perfil"],
  ];
  const search = (e: FormEvent) => {
    e.preventDefault();
    nav(`/ventas?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Saltar al contenido
      </a>
      <aside className="side">
        <Link to="/ventas" className="logo">
          <span className="brand-mark brand-mark-sm">
            <i />
            <i />
            <i />
          </span>
          EndosoFlow
        </Link>
        <nav aria-label="Principal">
          {items.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "is-on" : "")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <span className="avatar" aria-hidden>
            {initials(user.firstName, user.lastName)}
          </span>
          <div>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <small>{roleLabel[user.role]}</small>
          </div>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => logout().then(() => nav("/iniciar-sesion"))}
          >
            Salir
          </button>
        </div>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <form onSubmit={search} role="search">
            <input
              type="search"
              placeholder="Buscar ventas y clientes"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Búsqueda global"
            />
          </form>
          <Link className="btn btn-primary" to="/ventas/nueva">
            Nueva venta
          </Link>
        </header>
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
      {expired && <ReloginModal />}
    </div>
  );
}

export function RequireAdmin() {
  const { user } = useAuth();
  return user?.role === "system_admin" ? (
    <Outlet />
  ) : (
    <Navigate to="/no-encontrado" replace />
  );
}
