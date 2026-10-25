import type { Temperature } from "../shared/labels";

export type SaleState = "active" | "completed" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed";
export interface DocFile {
  name: string;
  size: number;
  uploadedAt: string;
}
export interface TaskInstance {
  n: number;
  status: TaskStatus;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  data: Record<string, string>;
  docs: Record<string, DocFile>;
  notes: string;
}
export interface HistoryEvent {
  id: string;
  at: string;
  actor: string;
  kind: "sale" | "task" | "document" | "advisor";
  text: string;
  reason?: string;
}
export interface Customer {
  id: string;
  type: string;
  docType: string;
  docNumber: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  gender?: "M" | "F";
  legalName?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactJobTitle?: string;
  nationality: string;
  phone: string;
  email: string;
  isActive: boolean;
  nameSource: "manual" | "looked_up";
  createdByAdvisorId?: string;
}
export interface Sale {
  id: string;
  code: string;
  customer: {
    id: string;
    name: string;
    docType: string;
    docNumber: string;
    type: string;
  };
  vehicle: {
    model: string;
    version: string;
    color: string;
    colorHex: string;
    price: string;
  };
  advisor: { id: string; name: string };
  temperature: Temperature;
  state: SaleState;
  createdAt: string;
  createdBy: string;
  notes: string;
  tasks: TaskInstance[];
  cancellation?: {
    category: string;
    text: string;
    atTask: number;
    at: string;
    by: string;
  };
  history: HistoryEvent[];
}
export interface CatalogModel {
  id: string;
  name: string;
  categories: string[];
  archived: boolean;
  versions: { id: string; name: string; price: string; archived: boolean }[];
  colors: { id: string; name: string; hex: string; archived: boolean }[];
}
