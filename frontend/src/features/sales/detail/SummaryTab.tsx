import { formatDate, formatMoney } from "../../../shared/lib/format";
import type { Sale, TaskItem } from "../../../shared/types";
import type { Toast } from "../../../shared/ui/toast";
import { TaskPill } from "../components/pills";
import { Icon } from "../../../shared/ui/Icon";
import type { ModalAction } from "../types";

export function SummaryTab({
  sale,
  activeTask,
  onOpenTask,
  onTaskAction,
  toast,
}: {
  sale: Sale;
  activeTask: TaskItem | undefined;
  onOpenTask: (taskNumber?: number) => void;
  onTaskAction: (action: ModalAction, taskNumber: number) => void;
  toast: (toast: Toast) => void;
}) {
  return (
    <div className="detail-summary-grid">
      <div className="summary-main-column">
        <div className="next-action-card">
          <div className="next-action-icon">
            <Icon
              name={
                activeTask?.status === "in_progress" ? "clock" : "check-circle"
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
              onClick={() => onTaskAction("start-task", activeTask.number)}
            >
              Iniciar tarea
            </button>
          )}
          {activeTask?.status === "in_progress" && (
            <button
              className="button button-secondary button-sm"
              onClick={() => {
                onOpenTask(activeTask.number);
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
          <button className="text-button" onClick={() => onOpenTask()}>
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
                  onOpenTask(task.number);
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
          <strong className="summary-vehicle-name">{sale.vehicleModel}</strong>
          <span className="summary-vehicle-version">{sale.vehicleVersion}</span>
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
  );
}
