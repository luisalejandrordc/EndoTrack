import { currentTaskNumber, isEligible } from "../../domain/permissions";
import { taskDefs } from "../../domain/taskDefs";
import type { Sale } from "../../domain/types";
import { milestones, taskStatusLabel } from "../../shared/labels";

const msLabel = {
  completed: "Completado",
  in_progress: "En curso",
  pending: "Pendiente",
} as const;

/** Six milestones over 13 task nodes. Node shape (check, filled, dashed, plain) carries the state as well as colour. */
export function ProgressStrip({
  sale,
  onSelect,
}: {
  sale: Sale;
  onSelect: (n: number) => void;
}) {
  const cur = currentTaskNumber(sale);
  return (
    <div
      className={`strip${sale.state === "cancelled" ? " is-cancelled" : ""}`}
      role="group"
      aria-label="Avance de la venta"
    >
      <div className="strip-scroll">
        <div className="strip-grid">
          {milestones.map((m) => {
            const st = m.tasks.every(
              (n) => sale.tasks[n - 1].status === "completed",
            )
              ? "completed"
              : cur !== null && m.tasks.includes(cur)
                ? "in_progress"
                : "pending";
            return (
              <div
                key={m.n}
                className={`ms ms-${st}`}
                style={{ gridColumn: `span ${m.tasks.length}` }}
              >
                <span className="ms-name">{m.name}</span>
                <span className="ms-state">{msLabel[st]}</span>
              </div>
            );
          })}
          {sale.tasks.map((t) => {
            const eligible = sale.state === "active" && isEligible(sale, t);
            const label = `Tarea ${t.n}, ${taskDefs[t.n - 1].name}: ${eligible ? "lista para iniciar" : taskStatusLabel[t.status].toLowerCase()}`;
            return (
              <div
                key={t.n}
                className={`cell cell-${t.status}${t.n === 1 ? " is-first" : ""}${t.n === 13 ? " is-last" : ""}`}
              >
                <button
                  className={`node node-${t.status}${eligible ? " node-eligible" : ""}${t.n === cur ? " node-current" : ""}`}
                  onClick={() => onSelect(t.n)}
                  aria-label={label}
                  title={label}
                >
                  {t.status === "completed" ? "✓" : t.n}
                </button>
                <span className="node-name">{taskDefs[t.n - 1].name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
