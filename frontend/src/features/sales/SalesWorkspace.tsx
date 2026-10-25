import { useState } from "react";
import { TASK_NAMES } from "../../shared/demo/data";
import { initials } from "../../shared/lib/format";
import { type Role, type Sale } from "../../shared/types";
import { ApiGap } from "../../shared/ui/ApiGap";
import { Icon } from "../../shared/ui/Icon";
import { MetricCard } from "../../shared/ui/MetricCard";
import { StatusPill, TempPill } from "./components/pills";

export function SalesWorkspace({
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
