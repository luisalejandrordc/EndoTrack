import { useState } from "react";
import { roleShortLabel } from "../../shared/demo/data";
import { initials } from "../../shared/lib/format";
import { roleOptions } from "../../shared/lib/roles";
import { type EmployeeProfile, type Role } from "../../shared/types";
import { Icon } from "../../shared/ui/Icon";
import { type View } from "../navigation";

export function Topbar({
  page,
  user,
  demo,
  query,
  onQueryChange,
  onRoleChange,
  onNavigate,
  onMenuClick,
}: {
  page: View;
  user: EmployeeProfile;
  demo: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onRoleChange: (role: Role) => void;
  onNavigate: (page: View) => void;
  onMenuClick: () => void;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const titles: Record<View, string> = {
    sales: "Ventas",
    "sale-detail": "Detalle de venta",
    "new-sale": "Nueva venta",
    customers: "Clientes",
    catalog: "Catálogo de vehículos",
    staff: "Empleados",
    profile: "Mi perfil",
  };
  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu-button"
        aria-label="Abrir menú"
        onClick={onMenuClick}
      >
        <Icon name="menu" size={19} />
      </button>
      <div className="topbar-title">
        <div className="topbar-breadcrumb">
          Grupo Pana <Icon name="chevron-right" size={13} />{" "}
          <span>{titles[page]}</span>
        </div>
        <h1>{titles[page]}</h1>
      </div>
      <div className="topbar-actions">
        <div className="global-search">
          <Icon name="search" size={17} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar venta, cliente o vehículo…"
            aria-label="Búsqueda global"
          />
          <kbd>⌘ K</kbd>
        </div>
        {demo && (
          <label className="role-preview">
            <span>Vista demo</span>
            <select
              value={user.role}
              onChange={(event) => onRoleChange(event.target.value as Role)}
              aria-label="Cambiar rol de demostración"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleShortLabel[role]}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="notification-wrap">
          <button
            className={`icon-button notification-button ${notificationsOpen ? "selected" : ""}`}
            aria-label="Notificaciones"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Icon name="bell" size={19} />
            <i />
          </button>
          {notificationsOpen && (
            <div className="notification-popover">
              <div className="popover-heading">
                <strong>Notificaciones</strong>
                <span className="soft-badge">2 nuevas</span>
              </div>
              <div className="notification-item">
                <span className="notification-dot amber" />
                <div>
                  <strong>Abono pendiente de validar</strong>
                  <p>EF-2026-00418 · Tarea 4</p>
                  <small>Hace 2 horas</small>
                </div>
              </div>
              <div className="notification-item">
                <span className="notification-dot green" />
                <div>
                  <strong>Nueva venta registrada</strong>
                  <p>EF-2026-00417 · Toyota Yaris</p>
                  <small>Ayer</small>
                </div>
              </div>
              <button
                className="text-button small"
                onClick={() => {
                  setNotificationsOpen(false);
                  onNavigate("sales");
                }}
              >
                Ver ventas <Icon name="arrow-right" size={13} />
              </button>
            </div>
          )}
        </div>
        <div
          className="topbar-avatar"
          title={`${user.firstName} ${user.lastName}`}
        >
          {initials(`${user.firstName} ${user.lastName}`)}
        </div>
      </div>
    </header>
  );
}
