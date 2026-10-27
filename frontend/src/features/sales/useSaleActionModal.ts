import { useState } from "react";
import type { Employee, Sale } from "../../shared/types";
import type { Toast } from "../../shared/ui/toast";
import {
  applySaleAction,
  saleActionToast,
  validateSaleAction,
} from "./saleActions";
import type { ModalAction, ModalState } from "./types";

/** UI state for the confirm dialog that guards task and sale transitions. */
export function useSaleActionModal({
  sales,
  employees,
  updateSale,
  notify,
}: {
  sales: Sale[];
  employees: Employee[];
  updateSale: (saleId: string, change: (sale: Sale) => Sale) => void;
  notify: (toast: Toast) => void;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [reason, setReason] = useState("");
  const [cancelCategory, setCancelCategory] = useState("customer_withdrew");
  const [reassignee, setReassignee] = useState("demo-employee-3");

  function open(action: ModalAction, saleId: string, taskNumber?: number) {
    setModal({ action, saleId, taskNumber });
    setReason("");
    setCancelCategory("customer_withdrew");
    const selectedSale = sales.find((sale) => sale.id === saleId);
    const nextAdvisor = employees.find(
      (employee) =>
        employee.role === "sales_advisor" &&
        employee.isActive &&
        employee.id !== selectedSale?.advisorId,
    );
    setReassignee(nextAdvisor?.id || "");
  }

  function close() {
    setModal(null);
  }

  function confirm() {
    if (!modal) return;
    if (!sales.some((item) => item.id === modal.saleId)) return setModal(null);
    const input = { reason, cancelCategory, reassigneeId: reassignee };
    const invalid = validateSaleAction(modal.action, input);
    if (invalid) return notify(invalid);

    updateSale(modal.saleId, (sale) =>
      applySaleAction(sale, modal.action, modal.taskNumber, input, employees),
    );
    notify(saleActionToast(modal.action, modal.taskNumber));
    setModal(null);
  }

  return {
    modal,
    reason,
    setReason,
    cancelCategory,
    setCancelCategory,
    reassignee,
    setReassignee,
    open,
    close,
    confirm,
  };
}
