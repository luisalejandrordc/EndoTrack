import { useQuery } from "@tanstack/react-query";
import { staffApi } from "../../shared/api/api";
import { currentTaskNumber } from "../../domain/permissions";
import { taskDefs } from "../../domain/taskDefs";
import type { Sale } from "../../domain/types";
import { demoAdvisors } from "../../mock/seed";
import { saleStateLabel, temperatureLabel } from "../../shared/labels";
import { Badge } from "../../shared/ui/ui";

export const StateBadge = ({ s }: { s: Sale["state"] }) => <Badge tone={s === "active" ? "info" : s === "completed" ? "ok" : "neutral"}>{saleStateLabel[s]}</Badge>;
export const TempBadge = ({ t }: { t: Sale["temperature"] }) => <Badge tone={t === "hot" ? "danger" : t === "warm" ? "warn" : "info"}>{temperatureLabel[t]}</Badge>;

export function CurrentTask({ sale }: { sale: Sale }) {
  const n = currentTaskNumber(sale);
  if (sale.state === "completed") return <span className="muted">Entregada</span>;
  if (n === null) return <span className="muted">—</span>;
  const t = sale.tasks[n - 1];
  return <span>Tarea {n}: {taskDefs[n - 1].name} {t.status === "in_progress" ? <Badge tone="warn">En curso</Badge> : null}</span>;
}

/** Thirteen small cells: a glanceable version of the progress strip. */
export function MiniStrip({ sale }: { sale: Sale }) {
  const done = sale.tasks.filter((t) => t.status === "completed").length;
  return (
    <span className={`mini-strip${sale.state === "cancelled" ? " is-cancelled" : ""}`} role="img" aria-label={`${done} de 13 tareas completadas`}>
      {sale.tasks.map((t) => <i key={t.n} className={`m-${t.status}`} />)}
    </span>
  );
}

/** Active advisors for pickers: the real GET /advisors, plus two demo advisors when the staff list has none yet. */
export function useAdvisors(enabled = true) {
  return useQuery({
    queryKey: ["advisors"], enabled,
    queryFn: async () => {
      let real: { id: string; name: string }[] = [];
      try { real = (await staffApi.advisors()).items.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` })); } catch { /* fall back to demo advisors */ }
      return real.length ? real : demoAdvisors.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName} (demo)` }));
    },
  });
}
