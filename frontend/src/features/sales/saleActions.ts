import { MILESTONES, buildTasks } from "../../shared/demo/data";
import type { Employee, Sale, TaskStatus } from "../../shared/types";
import type { Toast } from "../../shared/ui/toast";
import type { NewSaleDraft } from "./NewSaleWizard";
import type { ModalAction } from "./types";

/**
 * DEMO-ONLY sale logic.
 *
 * These pure functions mimic the task engine and sale lifecycle locally so
 * the provisional UI is usable before the backend exposes /sales routes.
 * When those routes exist (phase 1G), replace the callers with API mutations
 * and delete this file: the backend is the source of truth for every rule.
 */

export interface SaleActionInput {
  reason: string;
  cancelCategory: string;
  reassigneeId: string;
}

/** Returns the validation toast to show, or null when the input is valid. */
export function validateSaleAction(
  action: ModalAction,
  input: SaleActionInput,
): Toast | null {
  if (action === "cancel-sale" && !input.reason.trim())
    return {
      title: "Indica el motivo",
      message: "Para cancelar una venta debes registrar el motivo.",
      tone: "error",
    };
  if (action === "reopen-sale" && !input.reason.trim())
    return {
      title: "Indica el motivo",
      message: "La reapertura requiere una justificación.",
      tone: "error",
    };
  if (action === "reassign-sale" && !input.reassigneeId)
    return { title: "Selecciona un asesor", tone: "error" };
  return null;
}

export function applySaleAction(
  sale: Sale,
  action: ModalAction,
  taskNumber: number | undefined,
  input: SaleActionInput,
  employees: Employee[],
): Sale {
  if (action === "start-task" && taskNumber) {
    return {
      ...sale,
      tasks: sale.tasks.map((task) =>
        task.number === taskNumber && task.status === "eligible"
          ? { ...task, status: "in_progress" }
          : task,
      ),
    };
  }
  if (action === "complete-task" && taskNumber) {
    const tasks = sale.tasks.map((task) => {
      if (task.number === taskNumber)
        return {
          ...task,
          status: "completed" as TaskStatus,
          completedAt: new Date().toISOString(),
        };
      if (task.number === taskNumber + 1 && task.status === "pending")
        return {
          ...task,
          status: "eligible" as TaskStatus,
          dueDate: "2026-10-27",
        };
      return task;
    });
    return {
      ...sale,
      tasks,
      state: taskNumber === 13 ? "completed" : sale.state,
    };
  }
  if (action === "cancel-sale")
    return {
      ...sale,
      state: "cancelled",
      notes: `${sale.notes}${sale.notes ? "\n" : ""}Cancelación (${input.cancelCategory}): ${input.reason}`,
    };
  if (action === "reopen-sale")
    return {
      ...sale,
      state: "active",
      notes: `${sale.notes}${sale.notes ? "\n" : ""}Reapertura: ${input.reason}`,
    };
  if (action === "reassign-sale") {
    const employee = employees.find((c) => c.id === input.reassigneeId);
    return employee
      ? {
          ...sale,
          advisorId: employee.id,
          advisor: `${employee.firstName} ${employee.lastName}`,
          notes: `${sale.notes}${input.reason ? `\nReasignación: ${input.reason}` : ""}`,
        }
      : sale;
  }
  return sale;
}

export function saleActionToast(
  action: ModalAction,
  taskNumber?: number,
): Toast {
  switch (action) {
    case "start-task":
      return {
        title: `Tarea ${taskNumber} iniciada`,
        message: "Los campos editables están disponibles en la pestaña Tareas.",
        tone: "success",
      };
    case "complete-task":
      return {
        title: `Tarea ${taskNumber} completada`,
        message:
          taskNumber === 13
            ? "La operación se marcó como completada."
            : "La siguiente tarea quedó habilitada.",
        tone: "success",
      };
    case "cancel-sale":
      return {
        title: "Venta cancelada",
        message: "Se congelaron las tareas de la operación.",
        tone: "success",
      };
    case "reopen-sale":
      return {
        title: "Venta reabierta",
        message: "La operación volvió al estado activo.",
        tone: "success",
      };
    case "reassign-sale":
      return {
        title: "Asesor reasignado",
        message: "Se actualizó el responsable de la operación.",
        tone: "success",
      };
  }
}

export function buildSaleFromDraft(
  draft: NewSaleDraft,
  customerId: string,
  existingCount: number,
): Sale {
  return {
    id: `sale-${Date.now()}`,
    code: `EF-2026-${String(419 + existingCount).padStart(5, "0")}`,
    customerId,
    customerName: draft.customerName,
    customerDocument: `${draft.documentType} ${draft.documentNumber}`,
    customerType: draft.customerType,
    vehicleModel: draft.model.name,
    vehicleVersion: draft.version,
    vehicleColor: draft.color,
    vehicleImage: draft.model.image,
    advisor: `${draft.advisor.firstName} ${draft.advisor.lastName}`,
    advisorId: draft.advisor.id,
    temperature: draft.temperature,
    state: "active",
    createdAt: new Date().toISOString(),
    quotedPrice:
      draft.model.versions.find((version) => version.name === draft.version)
        ?.price ||
      draft.model.versions[0]?.price ||
      0,
    notes: draft.notes,
    tasks: buildTasks(0),
    milestones: MILESTONES,
  };
}
