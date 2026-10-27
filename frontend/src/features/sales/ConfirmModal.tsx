import { TASK_NAMES } from "../../shared/demo/data";
import { type Employee, type Sale } from "../../shared/types";
import { Field } from "../../shared/ui/Field";
import { Icon } from "../../shared/ui/Icon";
import { Modal } from "../../shared/ui/Modal";
import { type ModalAction, type ModalState } from "./types";

export function ConfirmModal({
  modal,
  sale,
  reason,
  setReason,
  category,
  setCategory,
  reassignee,
  setReassignee,
  employees,
  onClose,
  onConfirm,
}: {
  modal: Exclude<ModalState, null>;
  sale: Sale;
  reason: string;
  setReason: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  reassignee: string;
  setReassignee: (value: string) => void;
  employees: Employee[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const config: Record<
    ModalAction,
    { title: string; description: string; label: string }
  > = {
    "start-task": {
      title: `Iniciar tarea ${modal.taskNumber}`,
      description:
        "Al iniciar, la tarea quedará en progreso y se habilitarán sus campos editables.",
      label: "Sí, iniciar tarea",
    },
    "complete-task": {
      title: `Completar tarea ${modal.taskNumber}`,
      description:
        "Se guardará la información de esta tarea y la siguiente quedará habilitada si se cumplen las validaciones.",
      label: "Confirmar y completar",
    },
    "cancel-sale": {
      title: "Cancelar esta venta",
      description: `Vas a cancelar la operación ${sale.code}. Las tareas quedarán congeladas hasta que se reabra.`,
      label: "Confirmar cancelación",
    },
    "reopen-sale": {
      title: "Reabrir venta",
      description: `La operación ${sale.code} volverá a estar activa. Esta acción requiere registrar un motivo.`,
      label: "Reabrir operación",
    },
    "reassign-sale": {
      title: "Reasignar asesor",
      description:
        "Selecciona al asesor que continuará con la operación. El acceso anterior cambiará al confirmar.",
      label: "Confirmar reasignación",
    },
  };
  const isReason =
    modal.action === "cancel-sale" || modal.action === "reopen-sale";
  return (
    <Modal
      title={config[modal.action].title}
      description={config[modal.action].description}
      onClose={onClose}
      footer={
        <>
          <button className="button button-secondary" onClick={onClose}>
            Volver
          </button>
          <button
            className={`button ${modal.action === "cancel-sale" ? "button-danger" : "button-primary"}`}
            onClick={onConfirm}
          >
            {config[modal.action].label}
          </button>
        </>
      }
    >
      {modal.action === "start-task" && (
        <div className="confirm-detail">
          <span className="confirm-detail-icon">
            <Icon name="play" size={20} />
          </span>
          <div>
            <strong>{TASK_NAMES[(modal.taskNumber || 1) - 1]}</strong>
            <p>Solo una tarea puede estar en progreso por operación.</p>
          </div>
        </div>
      )}
      {modal.action === "complete-task" && (
        <div className="confirm-detail">
          <span className="confirm-detail-icon green">
            <Icon name="check-circle" size={20} />
          </span>
          <div>
            <strong>{TASK_NAMES[(modal.taskNumber || 1) - 1]}</strong>
            <p>
              Revisa los campos obligatorios y documentos antes de confirmar. En
              esta demo se simulará el cambio de estado.
            </p>
          </div>
        </div>
      )}
      {modal.action === "cancel-sale" && (
        <>
          <Field label="Motivo de cancelación">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="customer_withdrew">Cliente desistió</option>
              <option value="payment_or_financing_failed">
                Pago o financiamiento no concretado
              </option>
              <option value="unit_unavailable">Unidad no disponible</option>
              <option value="due_diligence_finding">
                Observación en debida diligencia
              </option>
              <option value="registration_error">Error de registro</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <Field
            label="Detalle del motivo"
            hint={
              category === "other"
                ? "Obligatorio para la categoría “Otro”."
                : "Agrega contexto para el historial interno."
            }
          >
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Describe brevemente el motivo…"
              required
            />
          </Field>
          <div className="modal-warning">
            <Icon name="alert" size={16} /> La venta y sus tareas pasarán a modo
            lectura.
          </div>
        </>
      )}
      {modal.action === "reopen-sale" && (
        <Field label="Motivo de reapertura">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Explica por qué se reabre la operación…"
            required
          />
        </Field>
      )}
      {modal.action === "reassign-sale" && (
        <>
          <Field label="Nuevo asesor responsable">
            <select
              value={reassignee}
              onChange={(event) => setReassignee(event.target.value)}
            >
              {employees
                .filter(
                  (employee) =>
                    employee.role === "sales_advisor" &&
                    employee.isActive &&
                    employee.id !== sale.advisorId,
                )
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Nota para el historial (opcional)">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Motivo o contexto de la reasignación…"
            />
          </Field>
        </>
      )}
    </Modal>
  );
}
