import { formatDate } from "../../../shared/lib/format";
import type { Sale, TaskItem } from "../../../shared/types";
import type { Toast } from "../../../shared/ui/toast";
import { Icon } from "../../../shared/ui/Icon";
import { TimelineItem } from "../components/TimelineItem";

export function HistoryTab({
  sale,
  activeTask,
  toast,
}: {
  sale: Sale;
  activeTask: TaskItem | undefined;
  toast: (toast: Toast) => void;
}) {
  return (
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
  );
}
