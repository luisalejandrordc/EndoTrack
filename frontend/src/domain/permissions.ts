import type { Profile } from "../shared/api/types";
import type { Sale, TaskInstance } from "./types";

/** Current task: the one in progress, else the lowest task that is not completed (null when all 13 are done). */
export const currentTaskNumber = (s: Sale): number | null =>
  (s.tasks.find((t) => t.status === "in_progress") ?? s.tasks.find((t) => t.status !== "completed"))?.n ?? null;

export const isManagerOrAdmin = (u: Profile) => u.role !== "sales_advisor";
/** "Own" means the current assigned advisor. Access never comes from who created the sale. */
export const canAct = (u: Profile, s: Sale) => isManagerOrAdmin(u) || s.advisor.id === u.id;
export const canSee = canAct;

export type Rule = { allowed: boolean; why?: string };
export function cancelRule(u: Profile, s: Sale): Rule {
  if (s.state !== "active") return { allowed: false };
  const c = currentTaskNumber(s) ?? 13;
  if (u.role === "system_admin") return { allowed: true };
  if (u.role === "sales_manager") return c <= 6 ? { allowed: true } : { allowed: false, why: "Después de la tarea 6 solo un Administrador puede cancelar." };
  return canAct(u, s) && c <= 3 ? { allowed: true } : { allowed: false, why: "Solicite la cancelación a un Gerente." };
}
export function reopenSaleRule(u: Profile, s: Sale): Rule {
  if (s.state !== "cancelled" || !s.cancellation) return { allowed: false };
  if (u.role === "system_admin") return { allowed: true };
  if (u.role === "sales_manager") return s.cancellation.atTask <= 6 ? { allowed: true } : { allowed: false, why: "Solo un Administrador puede reabrir una venta cancelada después de la tarea 6." };
  return { allowed: false };
}
export const canReassign = (u: Profile, s: Sale) => isManagerOrAdmin(u) && s.state === "active";
export const canDeleteSale = (u: Profile, s: Sale) => u.role === "system_admin" && !s.tasks[12].completedAt && s.history.every((h) => !/Tarea 13 completada/.test(h.text));

export const isEligible = (s: Sale, t: TaskInstance) => t.status === "pending" && s.tasks.slice(0, t.n - 1).every((x) => x.status === "completed") && !s.tasks.some((x) => x.status === "in_progress");
export const isLatestCompleted = (s: Sale, t: TaskInstance) => t.status === "completed" && !s.tasks.some((x) => x.n > t.n && x.status === "completed");
