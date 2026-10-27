import type { Sale } from "../../../shared/types";
import type { Toast } from "../../../shared/ui/toast";
import { TaskPanel } from "./TaskPanel";
import { Icon } from "../../../shared/ui/Icon";
import type { ModalAction } from "../types";

export function TasksTab({
  sale,
  selectedTask,
  onSelectTask,
  canManage,
  onTaskAction,
  toast,
}: {
  sale: Sale;
  selectedTask: number;
  onSelectTask: (taskNumber: number) => void;
  canManage: boolean;
  onTaskAction: (action: ModalAction, taskNumber: number) => void;
  toast: (toast: Toast) => void;
}) {
  const completedCount = sale.tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const selected =
    sale.tasks.find((task) => task.number === selectedTask) || sale.tasks[0];

  return (
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
              onClick={() => onSelectTask(task.number)}
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
      <div className="task-detail-column">
        <TaskPanel
          task={selected}
          sale={sale}
          canManage={canManage}
          onTaskAction={onTaskAction}
          toast={toast}
        />
      </div>
    </div>
  );
}
