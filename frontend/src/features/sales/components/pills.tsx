import {
  type Sale,
  type SaleState,
  type TaskStatus,
} from "../../../shared/types";
import { Icon } from "../../../shared/ui/Icon";

export function StatusPill({ state }: { state: SaleState }) {
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

export function TempPill({
  temperature,
}: {
  temperature: Sale["temperature"];
}) {
  const labels = { hot: "Alta", warm: "Media", cold: "Baja" };
  return (
    <span className={`temp-pill temp-${temperature}`}>
      <i />
      {labels[temperature]}
    </span>
  );
}

export function TaskPill({ status }: { status: TaskStatus }) {
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
