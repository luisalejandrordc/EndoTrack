import { formatDate, formatMoney } from "../../../shared/lib/format";
import type { Sale, TaskItem } from "../../../shared/types";
import type { Toast } from "../../../shared/ui/toast";
import { TaskPill } from "../components/pills";
import { Icon } from "../../../shared/ui/Icon";
import { Field } from "../../../shared/ui/Field";
import type { ModalAction } from "../types";

export function TaskPanel({
  task,
  sale,
  canManage,
  onTaskAction,
  toast,
}: {
  task: TaskItem;
  sale: Sale;
  canManage: boolean;
  onTaskAction: (action: ModalAction, taskNumber: number) => void;
  toast: (toast: Toast) => void;
}) {
  return (
    <div className="task-detail-panel">
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
              onClick={() => onTaskAction("start-task", task.number)}
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
              onClick={() => onTaskAction("complete-task", task.number)}
            >
              Completar tarea <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
