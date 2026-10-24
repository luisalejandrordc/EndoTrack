import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./components/Icon";
import { Modal } from "./components/Modal";
import { ApiError, api } from "./lib/api";
import {
  buildTasks,
  demoCustomers,
  demoEmployees,
  demoProfile,
  demoSales,
  demoVehicles,
  MILESTONES,
  roleLabel,
  roleShortLabel,
  TASK_NAMES,
} from "./data/demo";
import type {
  Customer,
  DocumentType,
  Employee,
  EmployeeProfile,
  Role,
  Sale,
  SaleState,
  TaskItem,
  TaskStatus,
  VehicleModel,
} from "./types";
import "./styles.css";

type View =
  | "sales"
  | "sale-detail"
  | "new-sale"
  | "customers"
  | "catalog"
  | "staff"
  | "profile";
type ModalAction =
  | "start-task"
  | "complete-task"
  | "cancel-sale"
  | "reopen-sale"
  | "reassign-sale";
type ModalState = {
  action: ModalAction;
  saleId: string;
  taskNumber?: number;
} | null;
type Toast = {
  title: string;
  message?: string;
  tone: "success" | "error" | "info";
};

const demoMode = import.meta.env.VITE_DEMO_MODE !== "false";
const roleOptions: Role[] = ["system_admin", "sales_manager", "sales_advisor"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0])
    .join("")
    .toUpperCase();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function roleName(role: Role) {
  return roleLabel[role];
}

function useAuth() {
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

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark">
        <span>E</span>
        <span>F</span>
      </div>
      {!compact && (
        <div className="brand-wordmark">
          <strong>EndosoFlow</strong>
          <span>GRUPO PANA</span>
        </div>
      )}
    </div>
  );
}

function LoginPage({
  onLogin,
  onDemoLogin,
  busy,
  error,
}: {
  onLogin: (input: {
    documentType: DocumentType;
    documentNumber: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<void>;
  onDemoLogin: () => void;
  busy: boolean;
  error: string;
}) {
  const [documentType, setDocumentType] = useState<DocumentType>("DNI");
  const [documentNumber, setDocumentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [notice, setNotice] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError("");
    try {
      await onLogin({
        documentType,
        documentNumber: documentNumber.trim(),
        password,
        rememberMe,
      });
    } catch {
      /* The shared error message is rendered below the form. */
    }
  }

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    setForgotBusy(true);
    setNotice("");
    setLocalError("");
    try {
      if (demoMode) {
        setNotice(
          "Si el identificador corresponde a una cuenta activa, recibirás un enlace en tu correo corporativo.",
        );
      } else {
        await api.forgotPassword({
          documentType,
          documentNumber: documentNumber.trim(),
        });
        setNotice(
          "Si el identificador corresponde a una cuenta activa, recibirás un enlace en tu correo corporativo.",
        );
      }
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "No fue posible procesar la solicitud.",
      );
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="login-layout">
      <section className="login-brand-panel">
        {/* <div className="login-brand-top"> */}
        {/*   <Brand /> */}
        {/*   <img */}
        {/*     src="endosoflow-logo-transparent.png" */}
        {/*     className="logo-image" */}
        {/*     alt="EndosoFlow Logo" */}
        {/*   /> */}
        {/* </div> */}
        <div className="login-visual">
          <div className="login-eyebrow">
            <span className="eyebrow-line" /> PLATAFORMA DE GESTIÓN COMERCIAL
          </div>
          <h1>
            Todo el proceso de venta.
            <br />
            <em>En un solo lugar.</em>
          </h1>
          <p>
            Conecta clientes, equipos y trámites en una experiencia de trabajo
            más clara, ordenada y trazable.
          </p>
          <div className="login-flow">
            <div className="flow-step">
              <span className="flow-number">01</span>
              <div>
                <strong>Gestiona la venta</strong>
                <small>Del primer contacto al cierre</small>
              </div>
              <Icon name="arrow-up-right" size={17} />
            </div>
            <div className="flow-step">
              <span className="flow-number">02</span>
              <div>
                <strong>Coordina cada tarea</strong>
                <small>Documentos, validaciones y pagos</small>
              </div>
              <Icon name="arrow-up-right" size={17} />
            </div>
            <div className="flow-step">
              <span className="flow-number">03</span>
              <div>
                <strong>Entrega con confianza</strong>
                <small>Un historial claro de principio a fin</small>
              </div>
              <Icon name="arrow-up-right" size={17} />
            </div>
          </div>
        </div>
        <div className="login-brand-footer">
          <span>© 2026 Grupo Pana</span>
          <span>OPERACIÓN · TRAZABILIDAD · CONFIANZA</span>
        </div>
        <div className="login-decoration decoration-one" />
        <div className="login-decoration decoration-two" />
      </section>
      <section className="login-form-panel">
        <div className="login-mobile-brand">{/* <Brand /> */}</div>
        <div className="login-form-card">
          <div className="login-form-heading">
            <div className="brand-container">
              <img
                src="endosoflow-logo-transparent.png"
                className="logo-image"
                alt="EndosoFlow Logo"
              />
            </div>
            <span className="section-kicker">PORTAL DE COLABORADORES</span>
            <h2>
              {forgot ? "Recupera tu acceso" : "Qué bueno tenerte de vuelta"}
            </h2>
            <p>
              {forgot
                ? "Ingresa tu documento y te enviaremos las instrucciones si existe una cuenta asociada."
                : "Ingresa con tus credenciales corporativas para continuar."}
            </p>
          </div>
          {forgot ? (
            <form onSubmit={requestReset} className="form-stack">
              <Field label="Tipo de documento">
                <select
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(event.target.value as DocumentType)
                  }
                >
                  <option>DNI</option>
                  <option>CE</option>
                  <option>PAS</option>
                </select>
              </Field>
              <Field label="Número de documento">
                <input
                  required
                  value={documentNumber}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                  placeholder="Ingresa tu número"
                  autoComplete="username"
                />
              </Field>
              {notice && (
                <div className="inline-success">
                  <Icon name="check-circle" size={18} />
                  <span>{notice}</span>
                </div>
              )}
              {(localError || error) && (
                <div className="inline-error">
                  <Icon name="alert" size={18} />
                  <span>{localError || error}</span>
                </div>
              )}
              <button
                className="button button-primary button-wide"
                disabled={forgotBusy}
              >
                {forgotBusy ? "Enviando solicitud…" : "Enviar instrucciones"}{" "}
                <Icon name="arrow-right" size={17} />
              </button>
              <button
                type="button"
                className="text-button centered"
                onClick={() => {
                  setForgot(false);
                  setNotice("");
                  setLocalError("");
                }}
              >
                Volver a iniciar sesión
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="form-stack">
              <Field label="Tipo de documento">
                <select
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(event.target.value as DocumentType)
                  }
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de extranjería</option>
                  <option value="PAS">Pasaporte</option>
                </select>
              </Field>
              <Field label="Número de documento">
                <input
                  required
                  value={documentNumber}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                  placeholder="Ej. 45871236"
                  autoComplete="username"
                />
              </Field>
              <Field label="Contraseña">
                <div className="password-input">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Icon name="eye" size={18} />
                  </button>
                </div>
              </Field>
              <div className="login-form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Mantener sesión iniciada</span>
                </label>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setForgot(true);
                    setNotice("");
                    setLocalError("");
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              {(error || localError) && (
                <div className="inline-error">
                  <Icon name="alert" size={18} />
                  <span>{error || localError}</span>
                </div>
              )}
              <button
                className="button button-primary button-wide"
                disabled={busy}
              >
                {busy ? "Verificando acceso…" : "Iniciar sesión"}{" "}
                <Icon name="arrow-right" size={17} />
              </button>
              {demoMode && (
                <>
                  <div className="login-divider">
                    <span /> <small>O PARA TU PRESENTACIÓN</small> <span />
                  </div>
                  <button
                    type="button"
                    className="button button-demo button-wide"
                    onClick={onDemoLogin}
                  >
                    <Icon name="sparkles" size={18} /> Entrar en modo
                    demostración
                  </button>
                  <p className="demo-note">
                    Accede con datos de muestra. No necesitas credenciales ni
                    conexión con el backend.
                  </p>
                </>
              )}
            </form>
          )}
          <div className="login-security">
            <Icon name="shield-check" size={17} />
            <span>Acceso protegido para personal autorizado de Grupo Pana</span>
          </div>
        </div>
        <div className="login-help">
          <span>¿Necesitas ayuda?</span> Contacta al administrador de tu cuenta.
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

function Sidebar({
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
          <Brand />
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

function Topbar({
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

function AppShell({
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

function StatusPill({ state }: { state: SaleState }) {
  const label: Record<SaleState, string> = {
    active: "En curso",
    completed: "Completada",
    cancelled: "Cancelada",
  };
  return (
    <span className={`status-pill status-${state}`}>
      <i />
      {label[state]}
    </span>
  );
}

function TempPill({ temperature }: { temperature: Sale["temperature"] }) {
  const labels = { hot: "Alta", warm: "Media", cold: "Baja" };
  return (
    <span className={`temp-pill temp-${temperature}`}>
      <i />
      {labels[temperature]}
    </span>
  );
}

function TaskPill({ status }: { status: TaskStatus }) {
  const meta: Record<TaskStatus, { label: string; className: string }> = {
    pending: { label: "Pendiente", className: "task-pending" },
    eligible: { label: "Lista para iniciar", className: "task-eligible" },
    in_progress: { label: "En progreso", className: "task-in-progress" },
    completed: { label: "Completada", className: "task-completed" },
  };
  return (
    <span className={`task-pill ${meta[status].className}`}>
      {status === "completed" ? (
        <Icon name="check" size={12} />
      ) : status === "in_progress" ? (
        <span className="tiny-spinner" />
      ) : status === "eligible" ? (
        <Icon name="play" size={10} />
      ) : (
        <i />
      )}
      {meta[status].label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
  change,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: IconName;
  tone: string;
  change?: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon name={icon} size={19} />
      </div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>
          {change && <b>{change}</b>}
          {detail}
        </small>
      </div>
      <span className="metric-trend">
        <Icon name="arrow-up-right" size={16} />
      </span>
    </article>
  );
}

function SalesWorkspace({
  sales,
  role,
  userId,
  query,
  onCreate,
  onOpen,
  demo,
}: {
  sales: Sale[];
  role: Role;
  userId: string;
  query: string;
  onCreate: () => void;
  onOpen: (sale: Sale) => void;
  demo: boolean;
}) {
  const [stateFilter, setStateFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [tempFilter, setTempFilter] = useState("all");
  const [sortNewest, setSortNewest] = useState(true);
  const scoped =
    role === "sales_advisor"
      ? sales.filter((sale) => sale.advisorId === userId)
      : sales;
  const filtered = scoped
    .filter((sale) => {
      const haystack =
        `${sale.code} ${sale.customerName} ${sale.customerDocument} ${sale.vehicleModel} ${sale.vehicleVersion} ${sale.advisor}`.toLocaleLowerCase(
          "es",
        );
      return (
        (!query || haystack.includes(query.toLocaleLowerCase("es"))) &&
        (stateFilter === "all" || sale.state === stateFilter) &&
        (taskFilter === "all" ||
          String(
            sale.tasks.find((task) => task.status === "in_progress")?.number ||
              sale.tasks.find((task) => task.status === "eligible")?.number ||
              13,
          ) === taskFilter) &&
        (tempFilter === "all" || sale.temperature === tempFilter)
      );
    })
    .sort((a, b) =>
      sortNewest
        ? b.createdAt.localeCompare(a.createdAt)
        : a.customerName.localeCompare(b.customerName),
    );
  const totalOpen = scoped.filter((sale) => sale.state === "active").length;
  const tasksActive = scoped.filter(
    (sale) =>
      sale.state === "active" &&
      sale.tasks.some((task) => task.status === "in_progress"),
  ).length;
  const completed = scoped.filter((sale) => sale.state === "completed").length;
  const highPriority = scoped.filter(
    (sale) => sale.state === "active" && sale.temperature === "hot",
  ).length;

  if (!demo)
    return (
      <ApiGap
        title="Ventas"
        detail="El OpenAPI adjunto aún no incluye las rutas de ventas. El espacio de trabajo está preparado para conectarse cuando publiques ese módulo."
      />
    );

  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <div className="section-kicker">SÁBADO, 24 DE OCTUBRE DE 2026</div>
          <h2>Hola, vamos a avanzar.</h2>
          <p>Este es el estado de tus operaciones comerciales.</p>
        </div>
        <button className="button button-primary" onClick={onCreate}>
          <Icon name="plus" size={18} /> Nueva venta
        </button>
      </div>
      <div className="metrics-grid">
        <MetricCard
          label="Ventas en curso"
          value={totalOpen}
          detail="operaciones activas"
          change="↗ "
          icon="sales"
          tone="metric-green"
        />
        <MetricCard
          label="Tareas en progreso"
          value={tasksActive}
          detail="requieren seguimiento"
          icon="clock"
          tone="metric-blue"
        />
        <MetricCard
          label="Ventas completadas"
          value={completed}
          detail="cerradas con éxito"
          icon="check-circle"
          tone="metric-purple"
        />
        <MetricCard
          label="Prioridad alta"
          value={highPriority}
          detail="clientes con interés alto"
          icon="alert"
          tone="metric-amber"
        />
      </div>
      <section className="workspace-card sales-table-card">
        <div className="card-heading">
          <div>
            <h3>Seguimiento de ventas</h3>
            <p>Controla las operaciones y encuentra la siguiente acción.</p>
          </div>
          <div className="table-heading-actions">
            <span className="count-pill">{filtered.length} registros</span>
            <button
              className="button button-secondary button-sm"
              onClick={() => {
                setStateFilter("all");
                setTaskFilter("all");
                setTempFilter("all");
              }}
            >
              <Icon name="filter-x" size={15} /> Limpiar filtros
            </button>
          </div>
        </div>
        <div className="filter-row">
          <label className="filter-control">
            <span>Estado</span>
            <select
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="active">En curso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </label>
          <label className="filter-control">
            <span>Tarea actual</span>
            <select
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value)}
            >
              <option value="all">Todas las tareas</option>
              {TASK_NAMES.map((name, index) => (
                <option key={name} value={String(index + 1)}>
                  Tarea {index + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-control">
            <span>Temperatura</span>
            <select
              value={tempFilter}
              onChange={(event) => setTempFilter(event.target.value)}
            >
              <option value="all">Todas</option>
              <option value="hot">Alta</option>
              <option value="warm">Media</option>
              <option value="cold">Baja</option>
            </select>
          </label>
          <button
            className="sort-button"
            onClick={() => setSortNewest(!sortNewest)}
          >
            <Icon name="calendar" size={16} />
            {sortNewest ? "Más recientes" : "Cliente A–Z"}
            <Icon name="chevron-down" size={14} />
          </button>
        </div>
        <div className="table-scroll">
          <table className="data-table sales-table">
            <thead>
              <tr>
                <th>CLIENTE / OPERACIÓN</th>
                <th>VEHÍCULO</th>
                <th>ASESOR</th>
                <th>PRIORIDAD</th>
                <th>TAREA ACTUAL</th>
                <th>ESTADO</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((sale) => {
                const task =
                  sale.tasks.find((item) => item.status === "in_progress") ||
                  sale.tasks.find((item) => item.status === "eligible") ||
                  sale.tasks.find((item) => item.status !== "completed");
                return (
                  <tr
                    key={sale.id}
                    onClick={() => onOpen(sale)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onOpen(sale);
                    }}
                  >
                    <td>
                      <div className="sale-customer-cell">
                        <div className="table-avatar">
                          {initials(sale.customerName)}
                        </div>
                        <div>
                          <strong>{sale.customerName}</strong>
                          <span>{sale.code}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="vehicle-cell">
                        <img src={sale.vehicleImage} alt="" />
                        <div>
                          <strong>
                            {sale.vehicleModel.replace("Toyota ", "")}
                          </strong>
                          <span>{sale.vehicleVersion}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="advisor-cell">
                        <span className="mini-avatar">
                          {initials(sale.advisor)}
                        </span>
                        <span>{sale.advisor}</span>
                      </div>
                    </td>
                    <td>
                      <TempPill temperature={sale.temperature} />
                    </td>
                    <td>
                      <div className="current-task-cell">
                        <span className="task-number">
                          {task ? String(task.number).padStart(2, "0") : "13"}
                        </span>
                        <div>
                          <strong>{task?.name || "Proceso finalizado"}</strong>
                          <span>
                            {task?.status === "in_progress"
                              ? "En progreso"
                              : task?.status === "eligible"
                                ? "Lista para iniciar"
                                : "Por iniciar"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusPill state={sale.state} />
                    </td>
                    <td>
                      <button
                        className="row-open-button"
                        aria-label={`Abrir ${sale.code}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(sale);
                        }}
                      >
                        <Icon name="chevron-right" size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="search" size={23} />
            </div>
            <h3>No encontramos ventas</h3>
            <p>Prueba cambiando la búsqueda o ajustando los filtros.</p>
            <button
              className="button button-secondary"
              onClick={() => {
                setStateFilter("all");
                setTaskFilter("all");
                setTempFilter("all");
              }}
            >
              Restablecer filtros
            </button>
          </div>
        )}
        <div className="table-footer">
          <span>
            Mostrando{" "}
            <strong>
              {filtered.length ? 1 : 0}–{filtered.length}
            </strong>{" "}
            de <strong>{filtered.length}</strong> registros
          </span>
          <div className="pagination">
            <button disabled>
              <Icon name="chevron-right" size={15} className="flip-icon" />
            </button>
            <span>1</span>
            <button disabled>
              <Icon name="chevron-right" size={15} />
            </button>
          </div>
        </div>
      </section>
      <div className="demo-banner">
        <Icon name="sparkles" size={17} />
        <span>
          <strong>Entorno de demostración.</strong> Los cambios de estado se
          guardan temporalmente en esta sesión y no modifican el backend.
        </span>
        <span className="demo-tag">DEMO</span>
      </div>
    </div>
  );
}

function MilestoneStrip({ sale }: { sale: Sale }) {
  const milestones = sale.milestones.map((name, index) => {
    const limits = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
      [11, 13],
    ][index];
    const tasks = sale.tasks.filter(
      (task) => task.number >= limits[0] && task.number <= limits[1],
    );
    const done = tasks.every((task) => task.status === "completed");
    const active = tasks.some(
      (task) => task.status === "in_progress" || task.status === "eligible",
    );
    return { name, number: index + 1, done, active, tasks };
  });
  const completedCount = sale.tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const progress = Math.round((completedCount / sale.tasks.length) * 100);
  return (
    <section className="progress-card">
      <div className="progress-head">
        <div>
          <span className="section-kicker">PROGRESO DE LA OPERACIÓN</span>
          <h3>Ruta de endoso</h3>
        </div>
        <div className="progress-percent">
          <strong>{progress}%</strong>
          <span>completado</span>
        </div>
      </div>
      <div className="progress-track">
        <div style={{ width: `${progress}%` }} />
      </div>
      <div className="milestone-grid">
        {milestones.map((milestone) => (
          <div
            className={`milestone ${milestone.done ? "done" : milestone.active ? "current" : ""}`}
            key={milestone.name}
          >
            <div className="milestone-node">
              {milestone.done ? (
                <Icon name="check" size={15} />
              ) : (
                <span>{String(milestone.number).padStart(2, "0")}</span>
              )}
            </div>
            <div className="milestone-label">
              <strong>{milestone.name}</strong>
              <span>
                {
                  milestone.tasks.filter((task) => task.status === "completed")
                    .length
                }{" "}
                de {milestone.tasks.length} tareas
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SaleDetail({
  sale,
  role,
  onBack,
  onTaskAction,
  onSaleAction,
  onSaveNotes,
  toast,
}: {
  sale: Sale;
  role: Role;
  onBack: () => void;
  onTaskAction: (action: ModalAction, taskNumber: number) => void;
  onSaleAction: (action: ModalAction) => void;
  onSaveNotes: (notes: string) => void;
  toast: (toast: Toast) => void;
}) {
  const [tab, setTab] = useState<
    "Resumen" | "Tareas" | "Documentos" | "Notas" | "Historial"
  >("Resumen");
  const current =
    sale.tasks.find((task) => task.status === "in_progress") ||
    sale.tasks.find((task) => task.status === "eligible") ||
    sale.tasks.find((task) => task.status !== "completed");
  const [selectedTask, setSelectedTask] = useState(current?.number || 1);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(sale.notes);
  const [documentStatuses, setDocumentStatuses] = useState<
    Record<string, string>
  >({
    "Cotización PDF": "Cargado",
    "Escaneo de documento de identidad": "Cargado",
    "Declaración jurada de conocimiento del cliente": "Pendiente",
    "Constancia de abono": "Pendiente",
    TIVe: "Pendiente",
  });
  const selected =
    sale.tasks.find((task) => task.number === selectedTask) || sale.tasks[0];
  const canManage = role !== "sales_advisor";
  const activeTask = sale.state === "active" ? current : undefined;
  const completedCount = sale.tasks.filter(
    (task) => task.status === "completed",
  ).length;

  useEffect(() => {
    setSelectedTask(current?.number || 1);
    setNotesDraft(sale.notes);
    setTab("Resumen");
  }, [sale.id]);

  const taskAction = (action: ModalAction, number: number) =>
    onTaskAction(action, number);
  const taskPanel = (task: TaskItem) => (
    <div className="task-detail-panel" key={task.number}>
      <div className="task-detail-heading">
        <div className="task-detail-title">
          <span className="task-number large">
            {String(task.number).padStart(2, "0")}
          </span>
          <div>
            <span className="section-kicker">TAREA {task.number} DE 13</span>
            <h3>{task.name}</h3>
            <p>
              {task.status === "eligible"
                ? "Esta tarea está habilitada y lista para comenzar."
                : task.status === "in_progress"
                  ? "Completa la información y los documentos requeridos para avanzar."
                  : task.status === "completed"
                    ? "Esta tarea fue completada. Los datos se muestran en modo lectura."
                    : `Primero debe completarse la tarea ${Math.max(1, task.number - 1)}.`}
            </p>
          </div>
        </div>
        <TaskPill status={task.status} />
      </div>
      {task.status === "pending" && (
        <div className="task-locked-message">
          <Icon name="lock" size={17} />
          <span>
            Esta tarea se habilitará cuando finalice la tarea anterior.
          </span>
        </div>
      )}
      {task.status === "in_progress" && (
        <div className="task-form-grid">
          {task.number === 4 ? (
            <>
              <Field label="Banco">
                <select defaultValue="bcp">
                  <option value="bcp">BCP</option>
                  <option>BBVA</option>
                  <option>Interbank</option>
                  <option>Scotiabank</option>
                  <option>Banco de la Nación</option>
                  <option>BanBif</option>
                </select>
              </Field>
              <Field label="Fecha de abono">
                <input type="date" defaultValue="2026-10-23" />
              </Field>
              <Field label="N.º de operación">
                <input placeholder="Ej. 004581237" defaultValue="004581237" />
              </Field>
              <Field label="Importe esperado">
                <div className="readonly-money">
                  {formatMoney(sale.quotedPrice)}
                </div>
              </Field>
              <Field label="Importe abonado">
                <input
                  type="number"
                  defaultValue={sale.quotedPrice - 250}
                  min="0"
                />
              </Field>
              <Field
                label="Motivo de diferencia"
                hint="Obligatorio cuando el importe no coincide con el esperado."
              >
                <input
                  defaultValue="Diferencia por comisión bancaria"
                  placeholder="Explica la diferencia"
                />
              </Field>
              <div className="task-upload-area">
                <div className="upload-symbol">
                  <Icon name="upload" size={20} />
                </div>
                <div>
                  <strong>Constancia de abono</strong>
                  <span>PDF · Máximo 10 MB · Visible para el cliente</span>
                </div>
                <label className="button button-secondary button-sm">
                  Adjuntar archivo
                  <input
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={(event) =>
                      event.target.files?.[0] &&
                      toast({
                        title: "Archivo listo para adjuntar",
                        message: event.target.files[0].name,
                        tone: "success",
                      })
                    }
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <Field label="Fecha de gestión">
                <input type="date" defaultValue="2026-10-24" />
              </Field>
              <Field label="Referencia / número de registro">
                <input placeholder="Ingresa la referencia" />
              </Field>
              <Field label="Observaciones" className="span-2">
                <textarea
                  rows={3}
                  placeholder="Agrega información necesaria para esta tarea…"
                />
              </Field>
              <div className="task-upload-area">
                <div className="upload-symbol">
                  <Icon name="upload" size={20} />
                </div>
                <div>
                  <strong>Documento de sustento</strong>
                  <span>PDF o Excel · Máximo 10 MB</span>
                </div>
                <label className="button button-secondary button-sm">
                  Adjuntar archivo
                  <input
                    type="file"
                    accept=".pdf,.xls,.xlsx"
                    hidden
                    onChange={(event) =>
                      event.target.files?.[0] &&
                      toast({
                        title: "Archivo listo para adjuntar",
                        message: event.target.files[0].name,
                        tone: "success",
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}
        </div>
      )}
      {task.status === "eligible" && (
        <div className="task-ready-panel">
          <span className="ready-icon">
            <Icon name="sparkles" size={18} />
          </span>
          <div>
            <strong>Todo listo para empezar</strong>
            <p>
              Al iniciar, podrás editar los campos y adjuntar los documentos de
              esta tarea.
            </p>
          </div>
          {sale.state === "active" && (
            <button
              className="button button-primary button-sm"
              onClick={() => taskAction("start-task", task.number)}
            >
              Iniciar tarea <Icon name="arrow-right" size={15} />
            </button>
          )}
        </div>
      )}
      {task.status === "completed" && (
        <div className="completed-info">
          <Icon name="check-circle" size={18} />
          <div>
            <strong>Tarea completada</strong>
            <span>
              {task.completedAt
                ? `Registrada el ${formatDate(task.completedAt)}`
                : "Los datos de esta tarea están en modo lectura."}
            </span>
          </div>
        </div>
      )}
      {task.status === "in_progress" && (
        <div className="task-panel-footer">
          <span>
            <Icon name="shield-check" size={15} /> Los cambios se validan al
            guardar la tarea.
          </span>
          <div>
            {canManage && (
              <button
                className="button button-secondary button-sm"
                onClick={() =>
                  toast({
                    title: "Reinicio disponible en el flujo de administración",
                    message:
                      "En el backend se requiere un motivo para reiniciar tareas.",
                    tone: "info",
                  })
                }
              >
                Reiniciar tarea
              </button>
            )}
            <button
              className="button button-primary button-sm"
              onClick={() => taskAction("complete-task", task.number)}
            >
              Completar tarea <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="page-stack sale-detail-page">
      <div className="detail-back-row">
        <button className="back-link" onClick={onBack}>
          <Icon name="arrow-left" size={16} /> Volver a ventas
        </button>
        <span className="detail-separator">/</span>
        <span>{sale.code}</span>
      </div>
      {sale.state === "cancelled" && (
        <div className="sale-alert sale-alert-red">
          <Icon name="alert" size={18} />
          <div>
            <strong>Esta operación está cancelada</strong>
            <span>
              Las tareas están en modo lectura. La razón registrada es visible
              solo para el equipo interno.
            </span>
          </div>
          {canManage && (
            <button
              className="button button-secondary button-sm"
              onClick={() => onSaleAction("reopen-sale")}
            >
              Reabrir venta
            </button>
          )}
        </div>
      )}
      {sale.state === "completed" && (
        <div className="sale-alert sale-alert-green">
          <Icon name="check-circle" size={18} />
          <div>
            <strong>¡Operación completada!</strong>
            <span>
              La venta alcanzó el cierre de las 13 tareas del proceso.
            </span>
          </div>
        </div>
      )}
      <section className="sale-hero-card">
        <div className="sale-hero-main">
          <div className="sale-hero-avatar">{initials(sale.customerName)}</div>
          <div className="sale-hero-copy">
            <div className="sale-code-row">
              <span className="sale-code">{sale.code}</span>
              <StatusPill state={sale.state} />
              <TempPill temperature={sale.temperature} />
            </div>
            <h2>{sale.customerName}</h2>
            <p>
              {sale.customerDocument} <span className="dot-separator">·</span>{" "}
              {sale.customerType}
            </p>
            <div className="sale-hero-meta">
              <span>
                <Icon name="user" size={14} /> {sale.advisor}
              </span>
              <span>
                <Icon name="calendar" size={14} /> Creada el{" "}
                {formatDate(sale.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="sale-hero-vehicle">
          <img src={sale.vehicleImage} alt={sale.vehicleModel} />
          <div>
            <span>UNIDAD ASOCIADA</span>
            <strong>{sale.vehicleModel}</strong>
            <small>
              {sale.vehicleVersion} <b>·</b> {sale.vehicleColor}
            </small>
          </div>
        </div>
        <div className="sale-hero-actions">
          <div className="price-block">
            <span>PRECIO DE REFERENCIA</span>
            <strong>{formatMoney(sale.quotedPrice)}</strong>
          </div>
          <div className="action-menu-wrap">
            <button
              className="button button-secondary"
              onClick={() => setActionsOpen(!actionsOpen)}
            >
              <Icon name="dots" size={18} /> Acciones{" "}
              <Icon name="chevron-down" size={14} />
            </button>
            {actionsOpen && (
              <div className="action-menu">
                {canManage && sale.state === "active" && (
                  <button
                    onClick={() => {
                      setActionsOpen(false);
                      onSaleAction("reassign-sale");
                    }}
                  >
                    <Icon name="users" size={16} /> Reasignar asesor
                  </button>
                )}
                {sale.state === "active" &&
                  (canManage || (activeTask && activeTask.number <= 3)) && (
                    <button
                      className="danger-menu-item"
                      onClick={() => {
                        setActionsOpen(false);
                        onSaleAction("cancel-sale");
                      }}
                    >
                      <Icon name="circle-x" size={16} /> Cancelar venta
                    </button>
                  )}
                {sale.state === "active" &&
                  !canManage &&
                  activeTask &&
                  activeTask.number > 3 && (
                    <button
                      className="danger-menu-item disabled-menu-item"
                      disabled
                      title="Solicite la cancelación a un Gerente"
                    >
                      <Icon name="circle-x" size={16} /> Cancelar venta{" "}
                      <small>Solicite a Gerencia</small>
                    </button>
                  )}
                {sale.state === "cancelled" && canManage && (
                  <button
                    onClick={() => {
                      setActionsOpen(false);
                      onSaleAction("reopen-sale");
                    }}
                  >
                    <Icon name="refresh" size={16} /> Reabrir venta
                  </button>
                )}
                {!canManage && sale.state === "active" && (
                  <div className="action-menu-note">
                    Solo Gerencia puede reasignar la venta.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      <MilestoneStrip sale={sale} />
      <section className="workspace-card sale-detail-content">
        <div className="detail-tabs" role="tablist">
          {(
            ["Resumen", "Tareas", "Documentos", "Notas", "Historial"] as const
          ).map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item === "Tareas" && <Icon name="list" size={16} />}
              {item === "Documentos" && <Icon name="file-text" size={16} />}
              {item === "Notas" && <Icon name="message" size={16} />}
              {item === "Historial" && <Icon name="history" size={16} />}
              {item}
              {item === "Tareas" && <span className="tab-count">13</span>}
            </button>
          ))}
        </div>
        {tab === "Resumen" && (
          <div className="detail-summary-grid">
            <div className="summary-main-column">
              <div className="next-action-card">
                <div className="next-action-icon">
                  <Icon
                    name={
                      activeTask?.status === "in_progress"
                        ? "clock"
                        : "check-circle"
                    }
                    size={22}
                  />
                </div>
                <div className="next-action-copy">
                  <span className="section-kicker">SIGUIENTE ACCIÓN</span>
                  <h3>
                    {sale.state !== "active"
                      ? sale.state === "completed"
                        ? "Proceso finalizado"
                        : "Venta cancelada"
                      : activeTask
                        ? activeTask.name
                        : "Listo para avanzar"}
                  </h3>
                  <p>
                    {sale.state !== "active"
                      ? "No hay tareas editables mientras la venta permanezca en este estado."
                      : activeTask?.status === "in_progress"
                        ? `La tarea ${activeTask.number} está en curso. Completa sus campos y documentos para desbloquear la siguiente.`
                        : `La tarea ${activeTask?.number || 13} está lista para iniciar.`}
                  </p>
                </div>
                {activeTask?.status === "eligible" && (
                  <button
                    className="button button-primary button-sm"
                    onClick={() => taskAction("start-task", activeTask.number)}
                  >
                    Iniciar tarea
                  </button>
                )}
                {activeTask?.status === "in_progress" && (
                  <button
                    className="button button-secondary button-sm"
                    onClick={() => {
                      setTab("Tareas");
                      setSelectedTask(activeTask.number);
                    }}
                  >
                    Continuar tarea <Icon name="arrow-right" size={14} />
                  </button>
                )}
              </div>
              <div className="subsection-heading">
                <h3>Resumen de la operación</h3>
                <span>Actualizado hace unos minutos</span>
              </div>
              <div className="summary-data-grid">
                <div className="summary-data-item">
                  <span>Cliente</span>
                  <strong>{sale.customerName}</strong>
                  <small>{sale.customerType}</small>
                </div>
                <div className="summary-data-item">
                  <span>Documento</span>
                  <strong>{sale.customerDocument}</strong>
                  <small>Registro de cliente</small>
                </div>
                <div className="summary-data-item">
                  <span>Asesor asignado</span>
                  <strong>{sale.advisor}</strong>
                  <small>Responsable de la operación</small>
                </div>
                <div className="summary-data-item">
                  <span>Fecha de creación</span>
                  <strong>{formatDate(sale.createdAt)}</strong>
                  <small>Hora local de Lima</small>
                </div>
              </div>
              <div className="subsection-heading progress-subheading">
                <h3>Avance de tareas</h3>
                <button
                  className="text-button"
                  onClick={() => setTab("Tareas")}
                >
                  Ver las 13 tareas <Icon name="arrow-right" size={14} />
                </button>
              </div>
              <div className="mini-task-list">
                {sale.tasks
                  .filter(
                    (task) =>
                      task.status === "completed" ||
                      task.status === "in_progress" ||
                      task.status === "eligible",
                  )
                  .slice(-4)
                  .map((task) => (
                    <button
                      key={task.number}
                      className="mini-task-row"
                      onClick={() => {
                        setSelectedTask(task.number);
                        setTab("Tareas");
                      }}
                    >
                      <span className={`mini-task-icon ${task.status}`}>
                        {task.status === "completed" ? (
                          <Icon name="check" size={14} />
                        ) : (
                          String(task.number).padStart(2, "0")
                        )}
                      </span>
                      <span className="mini-task-name">
                        <strong>{task.name}</strong>
                        <small>Tarea {task.number}</small>
                      </span>
                      <TaskPill status={task.status} />
                      <Icon name="chevron-right" size={15} />
                    </button>
                  ))}
              </div>
            </div>
            <aside className="summary-side-column">
              <div className="side-info-card">
                <div className="side-card-title">
                  <h3>Vehículo</h3>
                  <Icon name="car" size={17} />
                </div>
                <img
                  className="summary-vehicle-image"
                  src={sale.vehicleImage}
                  alt={sale.vehicleModel}
                />
                <strong className="summary-vehicle-name">
                  {sale.vehicleModel}
                </strong>
                <span className="summary-vehicle-version">
                  {sale.vehicleVersion}
                </span>
                <div className="vehicle-spec-row">
                  <span>Color</span>
                  <strong>
                    <i
                      className={`color-swatch swatch-${sale.vehicleColor.toLowerCase().includes("blanco") ? "white" : sale.vehicleColor.toLowerCase().includes("gris") || sale.vehicleColor.toLowerCase().includes("plata") ? "silver" : sale.vehicleColor.toLowerCase().includes("turquesa") ? "teal" : "black"}`}
                    />
                    {sale.vehicleColor}
                  </strong>
                </div>
                <div className="vehicle-spec-row">
                  <span>Precio referencial</span>
                  <strong>{formatMoney(sale.quotedPrice)}</strong>
                </div>
              </div>
              <div className="side-info-card contact-card">
                <div className="side-card-title">
                  <h3>Información de contacto</h3>
                  <Icon name="building" size={17} />
                </div>
                <div className="contact-line">
                  <span className="contact-icon">
                    <Icon name="mail" size={15} />
                  </span>
                  <div>
                    <span>Correo electrónico</span>
                    <strong>
                      {sale.customerId === "cus-1"
                        ? "administracion@canada.pe"
                        : sale.customerId === "cus-3"
                          ? "compras@oic.int"
                          : "contacto@cliente.pe"}
                    </strong>
                  </div>
                </div>
                <div className="contact-line">
                  <span className="contact-icon">
                    <Icon name="phone" size={15} />
                  </span>
                  <div>
                    <span>Teléfono</span>
                    <strong>+51 1 612 3000</strong>
                  </div>
                </div>
                <button
                  className="text-button full-width"
                  onClick={() =>
                    toast({
                      title: "Ficha de cliente",
                      message:
                        "La ficha completa se habilitará con el módulo de clientes conectado.",
                      tone: "info",
                    })
                  }
                >
                  Ver ficha de cliente <Icon name="arrow-up-right" size={14} />
                </button>
              </div>
            </aside>
          </div>
        )}
        {tab === "Tareas" && (
          <div className="tasks-tab-layout">
            <div className="tasks-list-column">
              <div className="subsection-heading">
                <div>
                  <h3>Tareas de la operación</h3>
                  <p>{completedCount} de 13 tareas completadas</p>
                </div>
                <span className="count-pill">{sale.tasks.length} tareas</span>
              </div>
              <div className="task-accordion-list">
                {sale.tasks.map((task) => (
                  <button
                    key={task.number}
                    className={`task-accordion-row ${selectedTask === task.number ? "selected" : ""}`}
                    onClick={() => setSelectedTask(task.number)}
                  >
                    <span className={`accordion-task-number ${task.status}`}>
                      {task.status === "completed" ? (
                        <Icon name="check" size={14} />
                      ) : (
                        String(task.number).padStart(2, "0")
                      )}
                    </span>
                    <div className="accordion-task-text">
                      <strong>{task.name}</strong>
                      <small>
                        {task.status === "completed"
                          ? "Completada"
                          : task.status === "in_progress"
                            ? "Acción en curso"
                            : task.status === "eligible"
                              ? "Lista para iniciar"
                              : "Pendiente"}
                      </small>
                    </div>
                    <Icon name="chevron-right" size={16} />
                  </button>
                ))}
              </div>
            </div>
            <div className="task-detail-column">{taskPanel(selected)}</div>
          </div>
        )}
        {tab === "Documentos" && (
          <div className="documents-tab">
            <div className="subsection-heading">
              <div>
                <h3>Documentos de la operación</h3>
                <p>Archivos asociados a cada etapa del proceso.</p>
              </div>
              <button
                className="button button-secondary button-sm"
                onClick={() =>
                  toast({
                    title: "Descarga preparada",
                    message:
                      "En modo demo, los documentos son representaciones visuales.",
                    tone: "info",
                  })
                }
              >
                <Icon name="download" size={15} /> Descargar lista
              </button>
            </div>
            <div className="document-groups">
              {[
                {
                  task: "Tarea 1 · Cotización",
                  items: ["Cotización PDF", "Cotización Excel"],
                },
                {
                  task: "Tarea 2 · Cliente",
                  items: [
                    "Escaneo de documento de identidad",
                    "Declaración jurada de conocimiento del cliente",
                    "Poder de representación",
                  ],
                },
                { task: "Tarea 4 · Pago", items: ["Constancia de abono"] },
                { task: "Tarea 10 · Inscripción", items: ["TIVe"] },
              ].map((group) => (
                <div className="document-group" key={group.task}>
                  <h4>{group.task}</h4>
                  {group.items.map((name) => (
                    <div className="document-row" key={name}>
                      <span
                        className={`document-icon ${documentStatuses[name] === "Cargado" ? "uploaded" : ""}`}
                      >
                        <Icon
                          name={
                            name.toLowerCase().includes("excel")
                              ? "file-text"
                              : "file-check"
                          }
                          size={17}
                        />
                      </span>
                      <div className="document-copy">
                        <strong>{name}</strong>
                        <span>
                          {name.toLowerCase().includes("excel")
                            ? "Excel · Interno"
                            : "PDF · Visible para el cliente"}
                        </span>
                      </div>
                      <span
                        className={`document-state ${documentStatuses[name] === "Cargado" ? "uploaded" : ""}`}
                      >
                        <i />
                        {documentStatuses[name] || "Pendiente"}
                      </span>
                      <label
                        className="icon-button document-upload"
                        title="Adjuntar o reemplazar archivo"
                      >
                        <Icon name="upload" size={16} />
                        <input
                          type="file"
                          accept=".pdf,.xls,.xlsx"
                          hidden
                          onChange={(event) => {
                            if (event.target.files?.[0]) {
                              setDocumentStatuses((old) => ({
                                ...old,
                                [name]: "Cargado",
                              }));
                              toast({
                                title: "Documento adjuntado",
                                message: event.target.files[0].name,
                                tone: "success",
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="muted-caption">
              <Icon name="shield-check" size={15} /> Los documentos internos no
              serán visibles para el cliente en la Fase 2.
            </p>
          </div>
        )}
        {tab === "Notas" && (
          <div className="notes-tab">
            <div className="subsection-heading">
              <div>
                <h3>Notas internas</h3>
                <p>
                  Información para el equipo comercial. No visible para el
                  cliente.
                </p>
              </div>
              <span className="internal-badge">
                <Icon name="lock" size={13} /> Solo interno
              </span>
            </div>
            <Field label="Notas de la operación">
              <textarea
                rows={7}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                placeholder="Agrega contexto, acuerdos o información para el equipo…"
              />
            </Field>
            <div className="notes-footer">
              <span>
                Las notas no modifican los datos originales de la venta.
              </span>
              <button
                className="button button-primary button-sm"
                onClick={() => {
                  onSaveNotes(notesDraft);
                  toast({
                    title: "Notas guardadas",
                    message: "La información quedó actualizada en esta sesión.",
                    tone: "success",
                  });
                }}
              >
                Guardar notas <Icon name="check" size={15} />
              </button>
            </div>
            <div className="note-history-item">
              <div className="avatar avatar-soft">{initials(sale.advisor)}</div>
              <div>
                <strong>{sale.advisor}</strong>
                <p>
                  {sale.notes || "Aún no hay notas adicionales registradas."}
                </p>
                <small>Nota asociada a {sale.code}</small>
              </div>
            </div>
          </div>
        )}
        {tab === "Historial" && (
          <div className="history-tab">
            <div className="subsection-heading">
              <div>
                <h3>Historial de actividad</h3>
                <p>Seguimiento de las acciones registradas en la operación.</p>
              </div>
              <button
                className="button button-secondary button-sm"
                onClick={() =>
                  toast({ title: "Historial actualizado", tone: "success" })
                }
              >
                <Icon name="refresh" size={15} /> Actualizar
              </button>
            </div>
            <div className="timeline">
              <TimelineItem
                icon="sales"
                title="Venta registrada"
                text={`Se creó la operación ${sale.code}.`}
                date={formatDate(sale.createdAt)}
                actor={sale.advisor}
                tone="green"
              />
              <TimelineItem
                icon="check-circle"
                title="Datos de la cotización completados"
                text="La información inicial de la unidad fue registrada."
                date={formatDate(sale.createdAt)}
                actor={sale.advisor}
                tone="blue"
              />
              {sale.tasks
                .filter((task) => task.status === "completed")
                .slice(-3)
                .reverse()
                .map((task) => (
                  <TimelineItem
                    key={task.number}
                    icon="check-circle"
                    title={`Tarea ${task.number} completada`}
                    text={task.name}
                    date={
                      task.completedAt
                        ? formatDate(task.completedAt)
                        : "Fecha de muestra"
                    }
                    actor={sale.advisor}
                    tone="green"
                  />
                ))}
              <TimelineItem
                icon="clock"
                title={
                  activeTask
                    ? `Tarea ${activeTask.number} ${activeTask.status === "in_progress" ? "iniciada" : "habilitada"}`
                    : "Estado actual de la operación"
                }
                text={activeTask?.name || "No hay tareas pendientes."}
                date="24 oct. 2026"
                actor={sale.advisor}
                tone="amber"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  text,
  date,
  actor,
  tone,
}: {
  icon: "sales" | "check-circle" | "clock";
  title: string;
  text: string;
  date: string;
  actor: string;
  tone: string;
}) {
  return (
    <div className="timeline-item">
      <div className={`timeline-node ${tone}`}>
        <Icon name={icon} size={15} />
      </div>
      <div className="timeline-content">
        <div className="timeline-title-row">
          <strong>{title}</strong>
          <span>{date}</span>
        </div>
        <p>{text}</p>
        <small>Por {actor}</small>
      </div>
    </div>
  );
}

interface NewSaleDraft {
  customerId?: string;
  customerName: string;
  documentType: string;
  documentNumber: string;
  customerType: string;
  email: string;
  phone: string;
  model: VehicleModel;
  version: string;
  color: string;
  temperature: Sale["temperature"];
  notes: string;
  advisor: Employee;
}

function NewSaleWizard({
  customers,
  vehicles,
  employees,
  role,
  userId,
  initialCustomer,
  onCancel,
  onCreate,
  toast,
}: {
  customers: Customer[];
  vehicles: VehicleModel[];
  employees: Employee[];
  role: Role;
  userId: string;
  initialCustomer?: Customer | null;
  onCancel: () => void;
  onCreate: (draft: NewSaleDraft) => void;
  toast: (toast: Toast) => void;
}) {
  const [step, setStep] = useState(1);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing",
  );
  const [customerId, setCustomerId] = useState(
    initialCustomer?.id || customers[0]?.id || "",
  );
  const [customerName, setCustomerName] = useState("");
  const [documentType, setDocumentType] = useState("RUC");
  const [documentNumber, setDocumentNumber] = useState("");
  const [customerType, setCustomerType] = useState("Embajada");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [modelId, setModelId] = useState(vehicles[0]?.id || "");
  const selectedModel =
    vehicles.find((model) => model.id === modelId) || vehicles[0];
  const [version, setVersion] = useState(
    selectedModel?.versions[1]?.name || selectedModel?.versions[0]?.name || "",
  );
  const [color, setColor] = useState(selectedModel?.colors[0] || "");
  const [temperature, setTemperature] = useState<Sale["temperature"]>("warm");
  const [notes, setNotes] = useState("");
  const [advisorId, setAdvisorId] = useState(
    role === "sales_advisor"
      ? userId
      : employees.find((employee) => employee.role === "sales_advisor")?.id ||
          "",
  );
  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );
  const selectedAdvisor =
    employees.find((employee) => employee.id === advisorId) ||
    employees.find((employee) => employee.role === "sales_advisor") ||
    employees[0];
  const selectedVersion =
    selectedModel?.versions.find((item) => item.name === version) ||
    selectedModel?.versions[0];
  const [customerSearch, setCustomerSearch] = useState("");

  function updateModel(id: string) {
    const next = vehicles.find((vehicle) => vehicle.id === id) || vehicles[0];
    setModelId(id);
    setVersion(next.versions[0]?.name || "");
    setColor(next.colors[0] || "");
  }

  function nextStep() {
    if (step === 1) {
      if (
        customerMode === "existing" &&
        (!selectedCustomer || !selectedCustomer.active)
      )
        return toast({
          title: "Selecciona un cliente activo",
          message:
            "Los clientes inactivos no pueden asociarse a nuevas ventas.",
          tone: "error",
        });
      if (
        customerMode === "new" &&
        (!customerName.trim() || !documentNumber.trim() || !email.trim())
      )
        return toast({
          title: "Completa los datos del cliente",
          message: "Nombre, documento y correo son obligatorios en esta vista.",
          tone: "error",
        });
    }
    if (step === 2 && (!selectedModel || !version || !color))
      return toast({ title: "Selecciona el vehículo", tone: "error" });
    setStep((value) => Math.min(4, value + 1));
  }

  function create() {
    const draft: NewSaleDraft = {
      ...(customerMode === "existing" && selectedCustomer
        ? { customerId: selectedCustomer.id }
        : {}),
      customerName:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.name
          : customerName,
      documentType:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.documentType
          : documentType,
      documentNumber:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.documentNumber
          : documentNumber,
      customerType:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.type
          : customerType,
      email:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.email
          : email,
      phone:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.phone
          : phone,
      model: selectedModel,
      version,
      color,
      temperature,
      notes,
      advisor: selectedAdvisor,
    };
    onCreate(draft);
  }

  return (
    <div className="page-stack new-sale-page">
      <div className="detail-back-row">
        <button className="back-link" onClick={onCancel}>
          <Icon name="arrow-left" size={16} /> Volver a ventas
        </button>
        <span className="detail-separator">/</span>
        <span>Registro de operación</span>
      </div>
      <div className="wizard-heading">
        <div>
          <span className="section-kicker">NUEVA OPERACIÓN COMERCIAL</span>
          <h2>Registra una nueva venta</h2>
          <p>
            Completa los datos en cuatro pasos. La operación y sus 13 tareas se
            crearán al confirmar.
          </p>
        </div>
        <span className="wizard-step-counter">
          PASO {step} <span>/</span> 4
        </span>
      </div>
      <div className="wizard-progress">
        <div className="wizard-progress-line">
          <span style={{ width: `${((step - 1) / 3) * 100}%` }} />
        </div>
        {[
          { number: 1, label: "Cliente", desc: "Identificación" },
          { number: 2, label: "Vehículo", desc: "Modelo y versión" },
          { number: 3, label: "Datos de venta", desc: "Asignación" },
          { number: 4, label: "Revisión", desc: "Confirmación" },
        ].map((item) => (
          <div
            key={item.number}
            className={`wizard-step ${step === item.number ? "current" : step > item.number ? "complete" : ""}`}
          >
            <span className="wizard-node">
              {step > item.number ? (
                <Icon name="check" size={16} />
              ) : (
                String(item.number).padStart(2, "0")
              )}
            </span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.desc}</small>
            </div>
          </div>
        ))}
      </div>
      <section className="workspace-card wizard-card">
        {step === 1 && (
          <div className="wizard-panel">
            <div className="wizard-panel-title">
              <span className="wizard-panel-icon">
                <Icon name="users" size={20} />
              </span>
              <div>
                <h3>¿Quién es el cliente?</h3>
                <p>Busca un cliente registrado o crea una ficha nueva.</p>
              </div>
            </div>
            <div className="choice-tabs">
              <button
                className={customerMode === "existing" ? "active" : ""}
                onClick={() => setCustomerMode("existing")}
              >
                Cliente existente
              </button>
              <button
                className={customerMode === "new" ? "active" : ""}
                onClick={() => setCustomerMode("new")}
              >
                <Icon name="plus" size={15} /> Nuevo cliente
              </button>
            </div>
            {customerMode === "existing" ? (
              <div className="customer-picker">
                <Field label="Buscar por nombre o documento">
                  <div className="input-with-icon">
                    <Icon name="search" size={16} />
                    <input
                      value={customerSearch}
                      onChange={(event) =>
                        setCustomerSearch(event.target.value)
                      }
                      placeholder="Nombre, DNI o RUC…"
                    />
                  </div>
                </Field>
                <div className="customer-choice-list">
                  {customers
                    .filter(
                      (customer) =>
                        customer.active &&
                        `${customer.name} ${customer.documentNumber}`
                          .toLowerCase()
                          .includes(customerSearch.toLowerCase()),
                    )
                    .map((customer) => (
                      <button
                        type="button"
                        key={customer.id}
                        className={`customer-choice ${customerId === customer.id ? "selected" : ""}`}
                        onClick={() => setCustomerId(customer.id)}
                      >
                        <span className="customer-choice-avatar">
                          {initials(customer.name)}
                        </span>
                        <span className="customer-choice-copy">
                          <strong>{customer.name}</strong>
                          <small>
                            {customer.documentType} {customer.documentNumber}{" "}
                            <b>·</b> {customer.type}
                          </small>
                        </span>
                        <span className="selection-radio">
                          {customerId === customer.id && <i />}
                        </span>
                      </button>
                    ))}
                </div>
                <p className="form-assist">
                  <Icon name="shield-check" size={15} /> La venta guardará una
                  instantánea de los datos del cliente.
                </p>
              </div>
            ) : (
              <div className="form-grid-two">
                <Field label="Tipo de cliente">
                  <select
                    value={customerType}
                    onChange={(event) => {
                      setCustomerType(event.target.value);
                      setDocumentType(
                        event.target.value === "Diplomático" ? "DNI" : "RUC",
                      );
                    }}
                  >
                    <option>Diplomático</option>
                    <option>Embajada</option>
                    <option>Entidad religiosa católica</option>
                    <option>Entidad religiosa no católica</option>
                    <option>Organismo Internacional</option>
                  </select>
                </Field>
                <Field label="Tipo de documento">
                  <select
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value)}
                  >
                    {(customerType === "Diplomático"
                      ? ["DNI", "CE", "PAS", "CDI"]
                      : ["RUC"]
                    ).map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={
                    customerType === "Diplomático"
                      ? "Nombre completo"
                      : "Razón social"
                  }
                >
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Nombre o razón social"
                    required
                  />
                </Field>
                <Field label="Número de documento">
                  <input
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(event.target.value)}
                    placeholder="Número sin espacios"
                    required
                  />
                </Field>
                <Field label="Correo electrónico">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@empresa.com"
                    required
                  />
                </Field>
                <Field label="Teléfono de contacto">
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+51 999 000 000"
                  />
                </Field>
                <p className="form-assist full-span">
                  <Icon name="info" size={15} /> La consulta automática de
                  identidad se habilitará al conectar el módulo de clientes.
                </p>
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="wizard-panel">
            <div className="wizard-panel-title">
              <span className="wizard-panel-icon">
                <Icon name="car" size={20} />
              </span>
              <div>
                <h3>Selecciona la unidad</h3>
                <p>
                  Elige el modelo, versión y color que se asociarán a esta
                  venta.
                </p>
              </div>
            </div>
            <div className="vehicle-picker-grid">
              {vehicles
                .filter((item) => item.active)
                .map((model) => (
                  <button
                    key={model.id}
                    className={`vehicle-choice-card ${modelId === model.id ? "selected" : ""}`}
                    onClick={() => updateModel(model.id)}
                  >
                    <div className="vehicle-choice-image">
                      <img src={model.image} alt={model.name} />
                      <span>{model.category}</span>
                    </div>
                    <div className="vehicle-choice-info">
                      <strong>{model.name}</strong>
                      <small>{model.description}</small>
                      <div className="vehicle-choice-price">
                        Desde{" "}
                        {formatMoney(
                          Math.min(...model.versions.map((item) => item.price)),
                        )}
                      </div>
                    </div>
                    <span className="selection-radio">
                      {modelId === model.id && <i />}
                    </span>
                  </button>
                ))}
            </div>
            <div className="form-grid-two vehicle-options-row">
              <Field label="Versión">
                <select
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                >
                  {selectedModel?.versions.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name} — {formatMoney(item.price)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Color disponible">
                <select
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                >
                  {selectedModel?.colors.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="selected-vehicle-summary">
              <span className="selected-check">
                <Icon name="check" size={15} />
              </span>
              <div>
                <strong>
                  {selectedModel?.name} · {version}
                </strong>
                <small>{color} · Precio de referencia</small>
              </div>
              <strong>{formatMoney(selectedVersion?.price || 0)}</strong>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="wizard-panel">
            <div className="wizard-panel-title">
              <span className="wizard-panel-icon">
                <Icon name="clipboard" size={20} />
              </span>
              <div>
                <h3>Define los datos de la operación</h3>
                <p>
                  Indica la prioridad comercial, asigna al asesor y agrega notas
                  internas.
                </p>
              </div>
            </div>
            <div className="field">
              <span className="field-label">Temperatura de la venta</span>
              <div className="temperature-choices">
                <button
                  className={temperature === "hot" ? "selected hot" : ""}
                  onClick={() => setTemperature("hot")}
                >
                  <span className="temp-choice-dot hot" />
                  <strong>Alta</strong>
                  <small>Cliente decidido, requiere acción rápida</small>
                  {temperature === "hot" && (
                    <Icon name="check-circle" size={17} />
                  )}
                </button>
                <button
                  className={temperature === "warm" ? "selected warm" : ""}
                  onClick={() => setTemperature("warm")}
                >
                  <span className="temp-choice-dot warm" />
                  <strong>Media</strong>
                  <small>Interés activo, en evaluación</small>
                  {temperature === "warm" && (
                    <Icon name="check-circle" size={17} />
                  )}
                </button>
                <button
                  className={temperature === "cold" ? "selected cold" : ""}
                  onClick={() => setTemperature("cold")}
                >
                  <span className="temp-choice-dot cold" />
                  <strong>Baja</strong>
                  <small>Seguimiento a largo plazo</small>
                  {temperature === "cold" && (
                    <Icon name="check-circle" size={17} />
                  )}
                </button>
              </div>
            </div>
            {role !== "sales_advisor" && (
              <Field label="Asesor responsable">
                <select
                  value={advisorId}
                  onChange={(event) => setAdvisorId(event.target.value)}
                >
                  {employees
                    .filter(
                      (employee) =>
                        employee.role === "sales_advisor" && employee.isActive,
                    )
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field
              label="Notas internas (opcional)"
              hint="Las notas serán visibles para el equipo interno, no para el cliente."
            >
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Acuerdos, fechas estimadas, información relevante…"
              />
            </Field>
            <div className="form-assist">
              <Icon name="info" size={15} />{" "}
              {role === "sales_advisor"
                ? "La venta se asignará automáticamente a tu usuario."
                : "Solo se muestran asesores activos en el selector."}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="wizard-panel review-panel">
            <div className="wizard-panel-title">
              <span className="wizard-panel-icon">
                <Icon name="file-check" size={20} />
              </span>
              <div>
                <h3>Revisa la información</h3>
                <p>
                  Confirma que los datos estén correctos antes de registrar la
                  venta.
                </p>
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-head">
                <h4>Cliente</h4>
                <button className="text-button" onClick={() => setStep(1)}>
                  Editar
                </button>
              </div>
              <div className="review-info-row">
                <div>
                  <span>Nombre o razón social</span>
                  <strong>
                    {customerMode === "existing"
                      ? selectedCustomer?.name
                      : customerName}
                  </strong>
                </div>
                <div>
                  <span>Documento</span>
                  <strong>
                    {customerMode === "existing"
                      ? selectedCustomer?.documentType
                      : documentType}{" "}
                    {customerMode === "existing"
                      ? selectedCustomer?.documentNumber
                      : documentNumber}
                  </strong>
                </div>
              </div>
              <div className="review-info-row">
                <div>
                  <span>Tipo de cliente</span>
                  <strong>
                    {customerMode === "existing"
                      ? selectedCustomer?.type
                      : customerType}
                  </strong>
                </div>
                <div>
                  <span>Contacto</span>
                  <strong>
                    {customerMode === "existing"
                      ? selectedCustomer?.email
                      : email}
                  </strong>
                </div>
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-head">
                <h4>Vehículo seleccionado</h4>
                <button className="text-button" onClick={() => setStep(2)}>
                  Editar
                </button>
              </div>
              <div className="review-vehicle">
                <img src={selectedModel?.image} alt={selectedModel?.name} />
                <div>
                  <strong>{selectedModel?.name}</strong>
                  <span>
                    {version} · {color}
                  </span>
                  <small>Precio de referencia</small>
                </div>
                <strong>{formatMoney(selectedVersion?.price || 0)}</strong>
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-head">
                <h4>Datos de venta</h4>
                <button className="text-button" onClick={() => setStep(3)}>
                  Editar
                </button>
              </div>
              <div className="review-info-row">
                <div>
                  <span>Temperatura</span>
                  <TempPill temperature={temperature} />
                </div>
                <div>
                  <span>Asesor asignado</span>
                  <strong>
                    {selectedAdvisor
                      ? `${selectedAdvisor.firstName} ${selectedAdvisor.lastName}`
                      : "Asignación automática"}
                  </strong>
                </div>
              </div>
              {notes && (
                <div className="review-notes">
                  <span>Notas internas</span>
                  <p>{notes}</p>
                </div>
              )}
            </div>
            <div className="review-disclaimer">
              <Icon name="shield-check" size={18} />
              <span>
                Al registrar, se creará la venta con una instantánea de los
                datos y las 13 tareas definidas para el proceso. En el modo
                demo, el registro se conserva solo en esta sesión.
              </span>
            </div>
          </div>
        )}
        <div className="wizard-footer">
          <button
            className="button button-secondary"
            onClick={
              step === 1 ? onCancel : () => setStep((value) => value - 1)
            }
          >
            {step === 1 ? (
              "Cancelar"
            ) : (
              <>
                <Icon name="arrow-left" size={16} /> Paso anterior
              </>
            )}
          </button>
          <div className="wizard-footer-right">
            <span>Paso {step} de 4</span>
            {step < 4 ? (
              <button className="button button-primary" onClick={nextStep}>
                Continuar <Icon name="arrow-right" size={16} />
              </button>
            ) : (
              <button className="button button-primary" onClick={create}>
                <Icon name="check" size={16} /> Confirmar y crear venta
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CustomersPage({
  customers,
  query,
  onNewSale,
  demo,
  role,
}: {
  customers: Customer[];
  query: string;
  onNewSale: (customer?: Customer) => void;
  demo: boolean;
  role: Role;
}) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const filtered = customers.filter(
    (customer) =>
      `${customer.name} ${customer.documentNumber} ${customer.type}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (typeFilter === "all" || customer.type === typeFilter) &&
      (activeFilter === "all" || String(customer.active) === activeFilter),
  );
  if (!demo)
    return (
      <ApiGap
        title="Clientes"
        detail="La API de clientes aparece en la arquitectura propuesta, pero no en el OpenAPI implementado adjunto. Esta pantalla utiliza datos de muestra en modo demo."
      />
    );
  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <span className="section-kicker">RELACIONES COMERCIALES</span>
          <h2>Directorio de clientes</h2>
          <p>
            Consulta la información y mantén las operaciones vinculadas a cada
            cliente.
          </p>
        </div>
        <button className="button button-primary" onClick={() => onNewSale()}>
          <Icon name="plus" size={17} /> Nueva venta
        </button>
      </div>
      <div className="metrics-grid compact-metrics">
        <MetricCard
          label="Clientes registrados"
          value={customers.length}
          detail="fichas en el sistema"
          icon="users"
          tone="metric-green"
        />
        <MetricCard
          label="Activos"
          value={customers.filter((customer) => customer.active).length}
          detail="disponibles para ventas"
          icon="check-circle"
          tone="metric-blue"
        />
        <MetricCard
          label="Tipos de cliente"
          value={new Set(customers.map((customer) => customer.type)).size}
          detail="segmentos comerciales"
          icon="building"
          tone="metric-purple"
        />
        <MetricCard
          label="Acceso restringido"
          value={role === "sales_advisor" ? "Sí" : "Por rol"}
          detail="visibilidad según asignación"
          icon="shield"
          tone="metric-amber"
        />
      </div>
      <section className="workspace-card">
        <div className="card-heading">
          <div>
            <h3>Clientes</h3>
            <p>Busca por nombre o número de documento.</p>
          </div>
          <span className="count-pill">{filtered.length} registros</span>
        </div>
        <div className="filter-row">
          <label className="filter-control">
            <span>Tipo de cliente</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Todos los tipos</option>
              {Array.from(
                new Set(customers.map((customer) => customer.type)),
              ).map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="filter-control">
            <span>Estado</span>
            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>CLIENTE</th>
                <th>DOCUMENTO</th>
                <th>TIPO</th>
                <th>CONTACTO</th>
                <th>ESTADO</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="sale-customer-cell">
                      <div className="table-avatar">
                        {initials(customer.name)}
                      </div>
                      <div>
                        <strong>{customer.name}</strong>
                        <span>ID · {customer.id.toUpperCase()}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong className="regular-strong">
                      {customer.documentType} {customer.documentNumber}
                    </strong>
                  </td>
                  <td>
                    <span className="type-tag">{customer.type}</span>
                  </td>
                  <td>
                    <div className="customer-contact-cell">
                      <span>
                        <Icon name="mail" size={13} />
                        {customer.email}
                      </span>
                      <span>
                        <Icon name="phone" size={13} />
                        {customer.phone}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${customer.active ? "status-active" : "status-inactive"}`}
                    >
                      <i />
                      {customer.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="row-open-button"
                      aria-label={`Crear venta para ${customer.name}`}
                      disabled={!customer.active}
                      title={
                        !customer.active
                          ? "Los clientes inactivos no pueden recibir nuevas ventas"
                          : "Crear venta con este cliente"
                      }
                      onClick={() => onNewSale(customer)}
                    >
                      <Icon name="arrow-up-right" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">
            <h3>Sin resultados</h3>
            <p>No hay clientes que coincidan con tu búsqueda.</p>
          </div>
        )}
        <div className="table-footer">
          <span>
            Vista de demostración · Los datos no provienen del backend
          </span>
          <span>{filtered.length} clientes</span>
        </div>
      </section>
    </div>
  );
}

function CatalogPage({
  vehicles,
  demo,
  role,
  toast,
}: {
  vehicles: VehicleModel[];
  demo: boolean;
  role: Role;
  toast: (toast: Toast) => void;
}) {
  const [category, setCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const filtered = vehicles.filter(
    (vehicle) =>
      (showArchived || vehicle.active) &&
      (category === "all" || vehicle.category === category),
  );
  if (!demo)
    return (
      <ApiGap
        title="Catálogo de vehículos"
        detail="El catálogo está descrito en la arquitectura, pero sus rutas todavía no aparecen en el OpenAPI implementado adjunto."
      />
    );
  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <span className="section-kicker">UNIDADES Y VERSIONES</span>
          <h2>Catálogo de vehículos</h2>
          <p>
            Explora los modelos y las versiones disponibles para nuevas
            operaciones.
          </p>
        </div>
        {role !== "sales_advisor" && (
          <button
            className="button button-primary"
            onClick={() =>
              toast({
                title: "Alta de modelos",
                message:
                  "El flujo de edición quedará conectado cuando esté implementado el módulo de catálogo.",
                tone: "info",
              })
            }
          >
            <Icon name="plus" size={17} /> Nuevo modelo
          </button>
        )}
      </div>
      <div className="catalog-toolbar">
        <div className="catalog-filter">
          <Icon name="filter" size={16} />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {Array.from(
              new Set(vehicles.map((vehicle) => vehicle.category)),
            ).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          <span>Mostrar archivados</span>
        </label>
        <span className="catalog-count">{filtered.length} modelos</span>
      </div>
      <div className="vehicle-catalog-grid">
        {filtered.map((vehicle) => (
          <article className="catalog-vehicle-card" key={vehicle.id}>
            <div className="catalog-vehicle-image">
              <img src={vehicle.image} alt={vehicle.name} />
              <span className="category-badge">{vehicle.category}</span>
              <span
                className={`catalog-status ${vehicle.active ? "" : "archived"}`}
              >
                {vehicle.active ? "Activo" : "Archivado"}
              </span>
            </div>
            <div className="catalog-vehicle-body">
              <div className="catalog-vehicle-heading">
                <h3>{vehicle.name}</h3>
                <button
                  className="icon-button subtle"
                  aria-label={`Opciones de ${vehicle.name}`}
                  onClick={() =>
                    toast({
                      title: vehicle.name,
                      message:
                        "Vista de consulta del catálogo en modo demostración.",
                      tone: "info",
                    })
                  }
                >
                  <Icon name="more" size={18} />
                </button>
              </div>
              <p>{vehicle.description}</p>
              <div className="catalog-vehicle-meta">
                <span>
                  <Icon name="layers" size={14} />
                  {vehicle.versions.length} versiones
                </span>
                <span>
                  <Icon name="tag" size={14} />
                  {vehicle.colors.length} colores
                </span>
              </div>
              <div className="catalog-version-list">
                {vehicle.versions.map((version) => (
                  <div key={version.name}>
                    <span>{version.name}</span>
                    <strong>{formatMoney(version.price)}</strong>
                  </div>
                ))}
              </div>
              <button
                className="catalog-footer-link"
                onClick={() =>
                  toast({
                    title: "Detalle del modelo",
                    message:
                      "Las imágenes por ángulo y edición del modelo están previstas para el módulo de catálogo.",
                    tone: "info",
                  })
                }
              >
                Ver detalle de modelo <Icon name="arrow-right" size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="demo-banner">
        <Icon name="info" size={16} />
        <span>
          Los modelos e imágenes ilustrativos corresponden a una vista de
          presentación. El catálogo real se leerá desde la API al estar
          disponible.
        </span>
      </div>
    </div>
  );
}

function StaffPage({
  user,
  demo,
  toast,
}: {
  user: EmployeeProfile;
  demo: boolean;
  toast: (toast: Toast) => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>(demoEmployees);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    documentType: "DNI" as DocumentType,
    documentNumber: "",
    firstName: "",
    lastName: "",
    nationality: "Peruana",
    gender: "F" as "F" | "M",
    birthdate: "",
    hireDate: "",
    businessPhone: "",
    businessEmail: "",
    personalPhone: "",
    personalEmail: "",
    role: "sales_advisor" as Role,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (demo || user.role !== "system_admin") return;
    let alive = true;
    setLoading(true);
    api
      .listEmployees({
        page: 1,
        pageSize: 100,
        status: status === "all" ? "all" : status,
        ...(roleFilter === "all" ? {} : { role: roleFilter as Role }),
        ...(query ? { q: query } : {}),
      })
      .then((result) => {
        if (alive) setEmployees(result.items);
      })
      .catch((error) =>
        toast({
          title: "No se pudo cargar la lista",
          message:
            error instanceof Error ? error.message : "Inténtalo de nuevo.",
          tone: "error",
        }),
      )
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [demo, user.role, status, roleFilter, query]);

  const filtered = employees.filter(
    (employee) =>
      `${employee.firstName} ${employee.lastName} ${employee.documentNumber} ${employee.businessEmail}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" ||
        (status === "active" ? employee.isActive : !employee.isActive)) &&
      (roleFilter === "all" || employee.role === roleFilter),
  );

  async function createEmployee(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (demo) {
        const next: Employee = {
          ...form,
          id: `demo-employee-${Date.now()}`,
          isActive: true,
          activatedAt: null,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setEmployees((old) => [next, ...old]);
        toast({
          title: "Empleado agregado",
          message: "Registro simulado creado. No se envió un correo real.",
          tone: "success",
        });
      } else {
        const result = await api.createEmployee(form);
        setEmployees((old) => [result.employee, ...old]);
        toast({
          title: "Empleado creado",
          message: result.activationLinkIssued
            ? "Se emitió el enlace de activación."
            : "No se pudo emitir el enlace; puedes reenviarlo más adelante.",
          tone: "success",
        });
      }
      setShowCreate(false);
      setForm({
        documentType: "DNI",
        documentNumber: "",
        firstName: "",
        lastName: "",
        nationality: "Peruana",
        gender: "F",
        birthdate: "",
        hireDate: "",
        businessPhone: "",
        businessEmail: "",
        personalPhone: "",
        personalEmail: "",
        role: "sales_advisor",
      });
    } catch (error) {
      toast({
        title: "No se pudo crear el empleado",
        message: error instanceof Error ? error.message : "Revisa los datos.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (user.role !== "system_admin")
    return (
      <div className="page-stack">
        <div className="permission-state">
          <div className="permission-icon">
            <Icon name="lock" size={24} />
          </div>
          <h2>Acceso restringido</h2>
          <p>
            Solo el Administrador del sistema puede consultar y administrar
            todos los empleados.
          </p>
        </div>
      </div>
    );

  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <span className="section-kicker">ADMINISTRACIÓN DE ACCESOS</span>
          <h2>Equipo de trabajo</h2>
          <p>Gestiona las cuentas de colaboradores y sus permisos de acceso.</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setShowCreate(true)}
        >
          <Icon name="plus" size={17} /> Nuevo empleado
        </button>
      </div>
      <div className="metrics-grid compact-metrics">
        <MetricCard
          label="Colaboradores"
          value={employees.length}
          detail="cuentas registradas"
          icon="users"
          tone="metric-green"
        />
        <MetricCard
          label="Cuentas activas"
          value={employees.filter((employee) => employee.isActive).length}
          detail="con acceso habilitado"
          icon="check-circle"
          tone="metric-blue"
        />
        <MetricCard
          label="Pendientes de activar"
          value={employees.filter((employee) => !employee.activatedAt).length}
          detail="sin contraseña definida"
          icon="clock"
          tone="metric-amber"
        />
        <MetricCard
          label="Administradores"
          value={
            employees.filter(
              (employee) =>
                employee.role === "system_admin" && employee.isActive,
            ).length
          }
          detail="con privilegios de sistema"
          icon="shield"
          tone="metric-purple"
        />
      </div>
      <section className="workspace-card">
        <div className="card-heading">
          <div>
            <h3>Colaboradores</h3>
            <p>Los cambios de rol y estado se validan en el backend.</p>
          </div>
          {loading && (
            <span className="loading-inline">
              <span className="tiny-spinner" /> Actualizando…
            </span>
          )}
        </div>
        <div className="staff-filter-row">
          <div className="input-with-icon staff-search">
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, documento o correo"
            />
          </div>
          <label className="filter-control">
            <span>Rol</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">Todos los roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabel[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-control">
            <span>Estado</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>COLABORADOR</th>
                <th>DOCUMENTO</th>
                <th>ROL</th>
                <th>CORREO CORPORATIVO</th>
                <th>ESTADO</th>
                <th>ACTIVACIÓN</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="sale-customer-cell">
                      <div className="table-avatar">
                        {initials(`${employee.firstName} ${employee.lastName}`)}
                      </div>
                      <div>
                        <strong>
                          {employee.firstName} {employee.lastName}
                        </strong>
                        <span>Desde {formatDate(employee.hireDate)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong className="regular-strong">
                      {employee.documentType} {employee.documentNumber}
                    </strong>
                  </td>
                  <td>
                    <span className={`role-badge role-${employee.role}`}>
                      {roleShortLabel[employee.role]}
                    </span>
                  </td>
                  <td>
                    <span className="email-cell">
                      <Icon name="mail" size={14} />
                      {employee.businessEmail}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${employee.isActive ? "status-active" : "status-inactive"}`}
                    >
                      <i />
                      {employee.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    {employee.activatedAt ? (
                      <span className="activation-status success">
                        <Icon name="check-circle" size={14} /> Activado
                      </span>
                    ) : (
                      <span className="activation-status pending">
                        <Icon name="clock" size={14} /> Pendiente
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="icon-button subtle"
                      title="Opciones"
                      onClick={() =>
                        toast({
                          title: `${employee.firstName} ${employee.lastName}`,
                          message:
                            "Edición, desactivación y reenvío de invitación se pueden conectar a las rutas de personal disponibles.",
                          tone: "info",
                        })
                      }
                    >
                      <Icon name="more" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Mostrando {filtered.length} colaboradores</span>
          <span>{demo ? "Datos de muestra" : "API conectada"}</span>
        </div>
      </section>
      {showCreate && (
        <Modal
          title="Registrar empleado"
          description="Se enviará un enlace de activación al correo corporativo cuando el backend lo permita."
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <button
                className="button button-secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </button>
              <button
                className="button button-primary"
                form="employee-form"
                type="submit"
                disabled={saving}
              >
                {saving ? "Guardando…" : "Crear empleado"}{" "}
                <Icon name="arrow-right" size={15} />
              </button>
            </>
          }
        >
          <form
            id="employee-form"
            onSubmit={createEmployee}
            className="create-employee-form"
          >
            <div className="form-grid-two">
              <Field label="Tipo de documento">
                <select
                  value={form.documentType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      documentType: event.target.value as DocumentType,
                    })
                  }
                >
                  <option>DNI</option>
                  <option>CE</option>
                  <option>PAS</option>
                </select>
              </Field>
              <Field label="Número de documento">
                <input
                  required
                  value={form.documentNumber}
                  onChange={(event) =>
                    setForm({ ...form, documentNumber: event.target.value })
                  }
                />
              </Field>
              <Field label="Nombres">
                <input
                  required
                  value={form.firstName}
                  onChange={(event) =>
                    setForm({ ...form, firstName: event.target.value })
                  }
                />
              </Field>
              <Field label="Apellidos">
                <input
                  required
                  value={form.lastName}
                  onChange={(event) =>
                    setForm({ ...form, lastName: event.target.value })
                  }
                />
              </Field>
              <Field label="Nacionalidad">
                <input
                  required
                  value={form.nationality}
                  onChange={(event) =>
                    setForm({ ...form, nationality: event.target.value })
                  }
                />
              </Field>
              <Field label="Género">
                <select
                  value={form.gender}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      gender: event.target.value as "F" | "M",
                    })
                  }
                >
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </Field>
              <Field label="Fecha de nacimiento">
                <input
                  required
                  type="date"
                  value={form.birthdate}
                  onChange={(event) =>
                    setForm({ ...form, birthdate: event.target.value })
                  }
                />
              </Field>
              <Field label="Fecha de contratación">
                <input
                  required
                  type="date"
                  value={form.hireDate}
                  onChange={(event) =>
                    setForm({ ...form, hireDate: event.target.value })
                  }
                />
              </Field>
              <Field label="Teléfono corporativo">
                <input
                  required
                  value={form.businessPhone}
                  onChange={(event) =>
                    setForm({ ...form, businessPhone: event.target.value })
                  }
                />
              </Field>
              <Field label="Correo corporativo">
                <input
                  required
                  type="email"
                  value={form.businessEmail}
                  onChange={(event) =>
                    setForm({ ...form, businessEmail: event.target.value })
                  }
                />
              </Field>
              <Field label="Teléfono personal (opcional)">
                <input
                  value={form.personalPhone}
                  onChange={(event) =>
                    setForm({ ...form, personalPhone: event.target.value })
                  }
                />
              </Field>
              <Field label="Correo personal (opcional)">
                <input
                  type="email"
                  value={form.personalEmail}
                  onChange={(event) =>
                    setForm({ ...form, personalEmail: event.target.value })
                  }
                />
              </Field>
              <Field label="Rol asignado" className="full-span">
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value as Role })
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel[role]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ProfilePage({
  user,
  demo,
  onSignOut,
  toast,
}: {
  user: EmployeeProfile;
  demo: boolean;
  onSignOut: () => void;
  toast: (toast: Toast) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 10)
      return toast({
        title: "Contraseña muy corta",
        message: "Utiliza al menos 10 caracteres.",
        tone: "error",
      });
    if (newPassword !== confirmPassword)
      return toast({ title: "Las contraseñas no coinciden", tone: "error" });
    setSaving(true);
    try {
      if (demo)
        toast({
          title: "Contraseña actualizada (demo)",
          message: "No se modificó ninguna credencial real.",
          tone: "success",
        });
      else {
        await api.changePassword({ currentPassword, newPassword });
        toast({
          title: "Contraseña actualizada",
          message: "La sesión finalizará por seguridad.",
          tone: "success",
        });
        onSignOut();
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "No se pudo cambiar la contraseña",
        message:
          error instanceof Error ? error.message : "Inténtalo nuevamente.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page-stack profile-page">
      <div className="welcome-row">
        <div>
          <span className="section-kicker">CUENTA Y SEGURIDAD</span>
          <h2>Mi perfil</h2>
          <p>Consulta tus datos corporativos y administra tu acceso.</p>
        </div>
      </div>
      <section className="workspace-card profile-identity-card">
        <div className="profile-cover">
          <div className="profile-pattern pattern-left" />
          <div className="profile-pattern pattern-right" />
          <span className="profile-cover-label">
            <Icon name="shield-check" size={15} /> CUENTA CORPORATIVA
          </span>
        </div>
        <div className="profile-identity-main">
          <div className="profile-large-avatar">
            {initials(`${user.firstName} ${user.lastName}`)}
          </div>
          <div className="profile-name-block">
            <h3>
              {user.firstName} {user.lastName}
            </h3>
            <p>{user.businessEmail}</p>
            <div className="profile-badges">
              <span className={`role-badge role-${user.role}`}>
                {roleLabel[user.role]}
              </span>
              <span className="status-pill status-active">
                <i /> Cuenta activa
              </span>
            </div>
          </div>
          <button
            className="button button-secondary button-sm"
            onClick={() =>
              toast({
                title: "Edición de perfil",
                message:
                  "La API actual permite consultar datos y cambiar contraseña; la edición de datos se habilitará más adelante.",
                tone: "info",
              })
            }
          >
            <Icon name="edit" size={15} /> Editar perfil
          </button>
        </div>
        <div className="profile-details-grid">
          <ProfileData
            label="Documento de identidad"
            value={`${user.documentType} ${user.documentNumber}`}
          />
          <ProfileData label="Correo corporativo" value={user.businessEmail} />
          <ProfileData label="Rol del sistema" value={roleLabel[user.role]} />
          <ProfileData label="Identificador de cuenta" value={user.id} />
        </div>
      </section>
      <section className="workspace-card password-card">
        <div className="password-card-intro">
          <div className="password-icon">
            <Icon name="lock" size={21} />
          </div>
          <div>
            <h3>Cambiar contraseña</h3>
            <p>
              Te recomendamos utilizar una contraseña única de al menos 10
              caracteres.
            </p>
          </div>
        </div>
        <form onSubmit={submitPassword} className="password-change-form">
          <Field label="Contraseña actual">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <div className="password-change-divider" />
          <Field label="Nueva contraseña" hint="Mínimo 10 caracteres.">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar nueva contraseña">
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <div className="password-rules">
            <span>
              <Icon
                name={newPassword.length >= 10 ? "check-circle" : "circle"}
                size={14}
              />{" "}
              Al menos 10 caracteres
            </span>
            <span>
              <Icon
                name={
                  newPassword && confirmPassword === newPassword
                    ? "check-circle"
                    : "circle"
                }
                size={14}
              />{" "}
              Las contraseñas coinciden
            </span>
          </div>
          <div className="password-form-footer">
            <span>
              <Icon name="shield-check" size={15} /> Al cambiarla, se cerrarán
              las sesiones activas.
            </span>
            <button className="button button-primary" disabled={saving}>
              {saving ? "Guardando…" : "Actualizar contraseña"}{" "}
              <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </form>
      </section>
      <div className="profile-signout-row">
        <div>
          <strong>¿Terminaste por hoy?</strong>
          <span>Cierra tu sesión de forma segura en este dispositivo.</span>
        </div>
        <button className="button button-secondary" onClick={onSignOut}>
          <Icon name="logout" size={16} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function ProfileData({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-data-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ApiGap({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="api-gap-card">
      <div className="api-gap-icon">
        <Icon name="database" size={26} />
      </div>
      <span className="section-kicker">MÓDULO EN INTEGRACIÓN</span>
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="api-gap-foot">
        <span>
          <Icon name="shield-check" size={16} /> El cliente no realizará
          llamadas a rutas no documentadas.
        </span>
        <span className="soft-badge">API-FIRST</span>
      </div>
    </div>
  );
}

function ToastView({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(id);
  }, [toast, onClose]);
  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      <span className="toast-icon">
        <Icon
          name={
            toast.tone === "success"
              ? "check-circle"
              : toast.tone === "error"
                ? "circle-x"
                : "info"
          }
          size={19}
        />
      </span>
      <div>
        <strong>{toast.title}</strong>
        {toast.message && <p>{toast.message}</p>}
      </div>
      <button
        className="icon-button"
        aria-label="Cerrar notificación"
        onClick={onClose}
      >
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}

function ConfirmModal({
  modal,
  sale,
  reason,
  setReason,
  category,
  setCategory,
  reassignee,
  setReassignee,
  employees,
  onClose,
  onConfirm,
}: {
  modal: Exclude<ModalState, null>;
  sale: Sale;
  reason: string;
  setReason: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  reassignee: string;
  setReassignee: (value: string) => void;
  employees: Employee[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const config: Record<
    ModalAction,
    { title: string; description: string; label: string }
  > = {
    "start-task": {
      title: `Iniciar tarea ${modal.taskNumber}`,
      description:
        "Al iniciar, la tarea quedará en progreso y se habilitarán sus campos editables.",
      label: "Sí, iniciar tarea",
    },
    "complete-task": {
      title: `Completar tarea ${modal.taskNumber}`,
      description:
        "Se guardará la información de esta tarea y la siguiente quedará habilitada si se cumplen las validaciones.",
      label: "Confirmar y completar",
    },
    "cancel-sale": {
      title: "Cancelar esta venta",
      description: `Vas a cancelar la operación ${sale.code}. Las tareas quedarán congeladas hasta que se reabra.`,
      label: "Confirmar cancelación",
    },
    "reopen-sale": {
      title: "Reabrir venta",
      description: `La operación ${sale.code} volverá a estar activa. Esta acción requiere registrar un motivo.`,
      label: "Reabrir operación",
    },
    "reassign-sale": {
      title: "Reasignar asesor",
      description:
        "Selecciona al asesor que continuará con la operación. El acceso anterior cambiará al confirmar.",
      label: "Confirmar reasignación",
    },
  };
  const isReason =
    modal.action === "cancel-sale" || modal.action === "reopen-sale";
  return (
    <Modal
      title={config[modal.action].title}
      description={config[modal.action].description}
      onClose={onClose}
      footer={
        <>
          <button className="button button-secondary" onClick={onClose}>
            Volver
          </button>
          <button
            className={`button ${modal.action === "cancel-sale" ? "button-danger" : "button-primary"}`}
            onClick={onConfirm}
          >
            {config[modal.action].label}
          </button>
        </>
      }
    >
      {modal.action === "start-task" && (
        <div className="confirm-detail">
          <span className="confirm-detail-icon">
            <Icon name="play" size={20} />
          </span>
          <div>
            <strong>{TASK_NAMES[(modal.taskNumber || 1) - 1]}</strong>
            <p>Solo una tarea puede estar en progreso por operación.</p>
          </div>
        </div>
      )}
      {modal.action === "complete-task" && (
        <div className="confirm-detail">
          <span className="confirm-detail-icon green">
            <Icon name="check-circle" size={20} />
          </span>
          <div>
            <strong>{TASK_NAMES[(modal.taskNumber || 1) - 1]}</strong>
            <p>
              Revisa los campos obligatorios y documentos antes de confirmar. En
              esta demo se simulará el cambio de estado.
            </p>
          </div>
        </div>
      )}
      {modal.action === "cancel-sale" && (
        <>
          <Field label="Motivo de cancelación">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="customer_withdrew">Cliente desistió</option>
              <option value="payment_or_financing_failed">
                Pago o financiamiento no concretado
              </option>
              <option value="unit_unavailable">Unidad no disponible</option>
              <option value="due_diligence_finding">
                Observación en debida diligencia
              </option>
              <option value="registration_error">Error de registro</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <Field
            label="Detalle del motivo"
            hint={
              category === "other"
                ? "Obligatorio para la categoría “Otro”."
                : "Agrega contexto para el historial interno."
            }
          >
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Describe brevemente el motivo…"
              required
            />
          </Field>
          <div className="modal-warning">
            <Icon name="alert" size={16} /> La venta y sus tareas pasarán a modo
            lectura.
          </div>
        </>
      )}
      {modal.action === "reopen-sale" && (
        <Field label="Motivo de reapertura">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Explica por qué se reabre la operación…"
            required
          />
        </Field>
      )}
      {modal.action === "reassign-sale" && (
        <>
          <Field label="Nuevo asesor responsable">
            <select
              value={reassignee}
              onChange={(event) => setReassignee(event.target.value)}
            >
              {employees
                .filter(
                  (employee) =>
                    employee.role === "sales_advisor" &&
                    employee.isActive &&
                    employee.id !== sale.advisorId,
                )
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Nota para el historial (opcional)">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Motivo o contexto de la reasignación…"
            />
          </Field>
        </>
      )}
    </Modal>
  );
}

export default function App() {
  const auth = useAuth();
  const [page, setPage] = useState<View>("sales");
  const [sales, setSales] = useState<Sale[]>(demoSales);
  const [customers, setCustomers] = useState<Customer[]>(demoCustomers);
  const [vehicles] = useState<VehicleModel[]>(demoVehicles);
  const [employees, setEmployees] = useState<Employee[]>(demoEmployees);
  const [query, setQuery] = useState("");
  const [activeSaleId, setActiveSaleId] = useState("sale-001");
  const [toast, setToast] = useState<Toast | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [modalReason, setModalReason] = useState("");
  const [cancelCategory, setCancelCategory] = useState("customer_withdrew");
  const [reassignee, setReassignee] = useState("demo-employee-3");
  const [loginBusy, setLoginBusy] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [presetCustomer, setPresetCustomer] = useState<Customer | null>(null);

  const activeSale = sales.find((sale) => sale.id === activeSaleId) || sales[0];
  const currentUser = auth.user;
  const canAccessSales =
    currentUser?.role !== "sales_advisor" ||
    Boolean(
      currentUser && sales.some((sale) => sale.advisorId === currentUser.id),
    );
  const visibleSalesForRole = useMemo(
    () =>
      currentUser?.role === "sales_advisor"
        ? sales.filter((sale) => sale.advisorId === currentUser.id)
        : sales,
    [sales, currentUser],
  );

  const notify = useCallback((nextToast: Toast) => setToast(nextToast), []);
  function navigate(nextPage: View, saleId?: string) {
    if (saleId) setActiveSaleId(saleId);
    setPage(nextPage);
    setShowMobileNav(false);
    setQuery("");
  }

  async function login(input: {
    documentType: DocumentType;
    documentNumber: string;
    password: string;
    rememberMe: boolean;
  }) {
    setLoginBusy(true);
    try {
      await auth.signIn(input);
      setPage("sales");
      notify({
        title: demoMode ? "Bienvenida al modo demo" : "Sesión iniciada",
        message: "Tu espacio de trabajo está listo.",
        tone: "success",
      });
    } finally {
      setLoginBusy(false);
    }
  }

  async function signOut() {
    await auth.signOut();
    setPage("sales");
    notify({
      title: "Sesión cerrada",
      message: "Has salido de EndosoFlow de forma segura.",
      tone: "success",
    });
  }

  function beginModal(
    action: ModalAction,
    saleId: string,
    taskNumber?: number,
  ) {
    setModal({ action, saleId, taskNumber });
    setModalReason("");
    setCancelCategory("customer_withdrew");
    const selectedSale = sales.find((sale) => sale.id === saleId);
    const nextAdvisor = employees.find(
      (employee) =>
        employee.role === "sales_advisor" &&
        employee.isActive &&
        employee.id !== selectedSale?.advisorId,
    );
    setReassignee(nextAdvisor?.id || "");
  }

  function handleTaskAction(action: ModalAction, taskNumber: number) {
    beginModal(action, activeSale.id, taskNumber);
  }

  function confirmModal() {
    if (!modal) return;
    const sale = sales.find((item) => item.id === modal.saleId);
    if (!sale) return setModal(null);
    if (modal.action === "cancel-sale" && !modalReason.trim())
      return notify({
        title: "Indica el motivo",
        message: "Para cancelar una venta debes registrar el motivo.",
        tone: "error",
      });
    if (modal.action === "reopen-sale" && !modalReason.trim())
      return notify({
        title: "Indica el motivo",
        message: "La reapertura requiere una justificación.",
        tone: "error",
      });
    if (modal.action === "reassign-sale" && !reassignee)
      return notify({ title: "Selecciona un asesor", tone: "error" });

    setSales((oldSales) =>
      oldSales.map((item) => {
        if (item.id !== sale.id) return item;
        if (modal.action === "start-task" && modal.taskNumber) {
          return {
            ...item,
            tasks: item.tasks.map((task) =>
              task.number === modal.taskNumber && task.status === "eligible"
                ? { ...task, status: "in_progress" }
                : task,
            ),
          };
        }
        if (modal.action === "complete-task" && modal.taskNumber) {
          const tasks = item.tasks.map((task) => {
            if (task.number === modal.taskNumber)
              return {
                ...task,
                status: "completed" as TaskStatus,
                completedAt: new Date().toISOString(),
              };
            if (
              task.number === modal.taskNumber! + 1 &&
              task.status === "pending"
            )
              return {
                ...task,
                status: "eligible" as TaskStatus,
                dueDate: "2026-10-27",
              };
            return task;
          });
          return {
            ...item,
            tasks,
            state: modal.taskNumber === 13 ? "completed" : item.state,
          };
        }
        if (modal.action === "cancel-sale")
          return {
            ...item,
            state: "cancelled",
            notes: `${item.notes}${item.notes ? "\n" : ""}Cancelación (${cancelCategory}): ${modalReason}`,
          };
        if (modal.action === "reopen-sale")
          return {
            ...item,
            state: "active",
            notes: `${item.notes}${item.notes ? "\n" : ""}Reapertura: ${modalReason}`,
          };
        if (modal.action === "reassign-sale") {
          const employee = employees.find(
            (candidate) => candidate.id === reassignee,
          );
          return employee
            ? {
                ...item,
                advisorId: employee.id,
                advisor: `${employee.firstName} ${employee.lastName}`,
                notes: `${item.notes}${modalReason ? `\nReasignación: ${modalReason}` : ""}`,
              }
            : item;
        }
        return item;
      }),
    );

    if (modal.action === "start-task")
      notify({
        title: `Tarea ${modal.taskNumber} iniciada`,
        message: "Los campos editables están disponibles en la pestaña Tareas.",
        tone: "success",
      });
    if (modal.action === "complete-task")
      notify({
        title: `Tarea ${modal.taskNumber} completada`,
        message:
          modal.taskNumber === 13
            ? "La operación se marcó como completada."
            : "La siguiente tarea quedó habilitada.",
        tone: "success",
      });
    if (modal.action === "cancel-sale")
      notify({
        title: "Venta cancelada",
        message: "Se congelaron las tareas de la operación.",
        tone: "success",
      });
    if (modal.action === "reopen-sale")
      notify({
        title: "Venta reabierta",
        message: "La operación volvió al estado activo.",
        tone: "success",
      });
    if (modal.action === "reassign-sale")
      notify({
        title: "Asesor reasignado",
        message: "Se actualizó el responsable de la operación.",
        tone: "success",
      });
    setModal(null);
  }

  function createSale(draft: NewSaleDraft) {
    let customerId = draft.customerId;
    if (!customerId) {
      customerId = `cus-${Date.now()}`;
      setCustomers((old) => [
        ...old,
        {
          id: customerId!,
          name: draft.customerName,
          documentType: draft.documentType,
          documentNumber: draft.documentNumber,
          type: draft.customerType,
          email: draft.email,
          phone: draft.phone,
          active: true,
        },
      ]);
    }
    const sale: Sale = {
      id: `sale-${Date.now()}`,
      code: `EF-2026-${String(419 + sales.length).padStart(5, "0")}`,
      customerId,
      customerName: draft.customerName,
      customerDocument: `${draft.documentType} ${draft.documentNumber}`,
      customerType: draft.customerType,
      vehicleModel: draft.model.name,
      vehicleVersion: draft.version,
      vehicleColor: draft.color,
      vehicleImage: draft.model.image,
      advisor: `${draft.advisor.firstName} ${draft.advisor.lastName}`,
      advisorId: draft.advisor.id,
      temperature: draft.temperature,
      state: "active",
      createdAt: new Date().toISOString(),
      quotedPrice:
        draft.model.versions.find((version) => version.name === draft.version)
          ?.price ||
        draft.model.versions[0]?.price ||
        0,
      notes: draft.notes,
      tasks: buildTasks(0),
      milestones: MILESTONES,
    };
    setSales((old) => [sale, ...old]);
    setActiveSaleId(sale.id);
    setPage("sale-detail");
    notify({
      title: "Venta creada correctamente",
      message: `${sale.code} ya tiene sus 13 tareas inicializadas.`,
      tone: "success",
    });
  }

  function saveNotes(saleId: string, notes: string) {
    setSales((old) =>
      old.map((sale) => (sale.id === saleId ? { ...sale, notes } : sale)),
    );
  }

  if (auth.authLoading)
    return (
      <div className="loading-screen">
        <Brand />
        <div className="loading-pulse" />
        <p>Conectando con el portal de colaboradores…</p>
      </div>
    );
  if (!currentUser)
    return (
      <LoginPage
        onLogin={login}
        onDemoLogin={() => {
          auth.signInDemo();
          setPage("sales");
          notify({
            title: "Bienvenida al modo demo",
            message: "Usa el selector de rol para probar distintas vistas.",
            tone: "success",
          });
        }}
        busy={loginBusy}
        error={auth.authError}
      />
    );

  return (
    <>
      <AppShell
        page={page}
        user={currentUser}
        query={query}
        setQuery={setQuery}
        onNavigate={navigate}
        onSignOut={signOut}
        onRoleChange={auth.changeDemoRole}
        mobileOpen={showMobileNav}
        onMenuClick={() => setShowMobileNav(true)}
        onCloseMobile={() => setShowMobileNav(false)}
      >
        {page === "sales" && (
          <SalesWorkspace
            sales={sales}
            role={currentUser.role}
            userId={currentUser.id}
            query={query}
            onCreate={() => navigate("new-sale")}
            onOpen={(sale) => navigate("sale-detail", sale.id)}
            demo={demoMode}
          />
        )}
        {page === "sale-detail" &&
          (demoMode ? (
            activeSale ? (
              <SaleDetail
                key={activeSale.id}
                sale={activeSale}
                role={currentUser.role}
                onBack={() => navigate("sales")}
                onTaskAction={handleTaskAction}
                onSaleAction={(action) => beginModal(action, activeSale.id)}
                onSaveNotes={(notes) => saveNotes(activeSale.id, notes)}
                toast={notify}
              />
            ) : (
              <ApiGap
                title="Venta no encontrada"
                detail="La venta solicitada no está disponible en tu ámbito de acceso."
              />
            )
          ) : (
            <ApiGap
              title="Detalle de venta"
              detail="Las rutas de detalle de ventas y tareas no aparecen en el OpenAPI implementado adjunto."
            />
          ))}
        {page === "new-sale" &&
          (demoMode ? (
            <NewSaleWizard
              customers={customers}
              vehicles={vehicles}
              employees={employees}
              role={currentUser.role}
              userId={currentUser.id}
              initialCustomer={presetCustomer}
              onCancel={() => {
                setPresetCustomer(null);
                navigate("sales");
              }}
              onCreate={(draft) => {
                createSale(draft);
                setPresetCustomer(null);
              }}
              toast={notify}
            />
          ) : (
            <ApiGap
              title="Nueva venta"
              detail="El contrato de ventas aún no está disponible en el OpenAPI implementado. La creación funcionará al integrar POST /sales cuando se publique en el contrato."
            />
          ))}
        {page === "customers" && (
          <CustomersPage
            customers={customers}
            query={query}
            onNewSale={(customer) => {
              setPresetCustomer(customer || null);
              navigate("new-sale");
            }}
            demo={demoMode}
            role={currentUser.role}
          />
        )}
        {page === "catalog" && (
          <CatalogPage
            vehicles={vehicles}
            demo={demoMode}
            role={currentUser.role}
            toast={notify}
          />
        )}
        {page === "staff" && (
          <StaffPage
            key={currentUser.role}
            user={currentUser}
            demo={demoMode}
            toast={notify}
          />
        )}
        {page === "profile" && (
          <ProfilePage
            user={currentUser}
            demo={demoMode}
            onSignOut={signOut}
            toast={notify}
          />
        )}
      </AppShell>
      {modal && activeSale && (
        <ConfirmModal
          modal={modal}
          sale={sales.find((sale) => sale.id === modal.saleId) || activeSale}
          reason={modalReason}
          setReason={setModalReason}
          category={cancelCategory}
          setCategory={setCancelCategory}
          reassignee={reassignee}
          setReassignee={setReassignee}
          employees={employees}
          onClose={() => setModal(null)}
          onConfirm={confirmModal}
        />
      )}
      {toast && <ToastView toast={toast} onClose={() => setToast(null)} />}
    </>
  );
}
