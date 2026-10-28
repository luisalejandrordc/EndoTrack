import { useState } from "react";
import { initials } from "../../shared/lib/format";
import { type Customer, type Role } from "../../shared/types";
import { Icon } from "../../shared/ui/Icon";
import { MetricCard } from "../../shared/ui/MetricCard";

/** The demo directory: sample data held in memory, used when the app runs without the backend. */
export function DemoCustomersPage({
  customers,
  query,
  onNewSale,
  role,
}: {
  customers: Customer[];
  query: string;
  onNewSale: (customer?: Customer) => void;
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
