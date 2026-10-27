export type ModalAction =
  | "start-task"
  | "complete-task"
  | "cancel-sale"
  | "reopen-sale"
  | "reassign-sale";

export type ModalState = {
  action: ModalAction;
  saleId: string;
  taskNumber?: number;
} | null;
