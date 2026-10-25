import { useState } from "react";
import { formatDate, formatMoney, initials } from "../../../shared/lib/format";
import type { Sale, TaskItem } from "../../../shared/types";
import { StatusPill, TempPill } from "../components/pills";
import { Icon } from "../../../shared/ui/Icon";
import type { ModalAction } from "../types";

export function SaleHero({
  sale,
  canManage,
  activeTask,
  onSaleAction,
}: {
  sale: Sale;
  canManage: boolean;
  activeTask: TaskItem | undefined;
  onSaleAction: (action: ModalAction) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
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
  );
}
