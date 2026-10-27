import { initials, roleName } from "../../shared/lib/format";
import { type EmployeeProfile } from "../../shared/types";
import { Icon } from "../../shared/ui/Icon";
import { type View } from "../navigation";

export function Sidebar({
  page,
  user,
  onNavigate,
  onSignOut,
  mobileOpen,
  onClose,
}: {
  page: View;
  user: EmployeeProfile;
  onNavigate: (page: View) => void;
  onSignOut: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const mainItems: {
    id: View;
    label: string;
    icon: "sales" | "users" | "car" | "user";
    badge?: string;
  }[] = [
    { id: "sales", label: "Ventas", icon: "sales" },
    { id: "customers", label: "Clientes", icon: "users" },
    { id: "catalog", label: "Catálogo de vehículos", icon: "car" },
  ];
  return (
    <>
      <div
        className={`mobile-nav-scrim ${mobileOpen ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          {/* <Brand /> */}
          <img
            src="endosoflow-logo-landscape.png"
            className="logo-landscape"
            alt="EndosoFlow Logo"
          />
          <img
            src="endosoflow-logo-square.png"
            className="logo-square"
            alt="EndosoFlow Logo"
          />
        </div>
        <div className="sidebar-workspace">
          <div className="workspace-avatar">GP</div>
          <div>
            <strong>Grupo Pana</strong>
            <span>Operaciones comerciales</span>
          </div>
          <Icon name="chevron-down" size={15} />
        </div>
        <div className="nav-section-label">ESPACIO DE TRABAJO</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {mainItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id || (item.id === "sales" && ["sale-detail", "new-sale"].includes(page)) ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "sales" && <span className="nav-counter">6</span>}
            </button>
          ))}
          {user.role === "system_admin" && (
            <button
              className={`nav-item ${page === "staff" ? "active" : ""}`}
              onClick={() => onNavigate("staff")}
            >
              <Icon name="shield" />
              <span>Empleados</span>
            </button>
          )}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-tip">
          <div className="tip-icon">
            <Icon name="sparkles" size={18} />
          </div>
          <strong>Un paso a la vez</strong>
          <p>
            Completa la tarea actual para habilitar la siguiente etapa de la
            venta.
          </p>
          <button onClick={() => onNavigate("sales")}>
            Ver mis ventas <Icon name="arrow-right" size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "profile" ? "active" : ""}`}
            onClick={() => onNavigate("profile")}
          >
            <Icon name="user" />
            <span>Mi perfil</span>
          </button>
          <div className="sidebar-user">
            <div className="avatar avatar-green">
              {initials(`${user.firstName} ${user.lastName}`)}
            </div>
            <div className="user-meta">
              <strong>
                {user.firstName} {user.lastName.split(" ")[0]}
              </strong>
              <span>{roleName(user.role)}</span>
            </div>
            <button
              className="icon-button subtle"
              aria-label="Cerrar sesión"
              onClick={onSignOut}
            >
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
