import { useState } from "react";
import { formatMoney } from "../../shared/lib/format";
import { type Role, type VehicleModel } from "../../shared/types";
import { ApiGap } from "../../shared/ui/ApiGap";
import { Icon } from "../../shared/ui/Icon";
import { type Toast } from "../../shared/ui/toast";

export function CatalogPage({
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
