import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { taskDefs } from "../../domain/taskDefs";
import { isManagerOrAdmin } from "../../domain/permissions";
import { salesApi } from "../../mock/api";
import { errorMessage } from "../../shared/api/client";
import { fmtDate } from "../../shared/format";
import { customerTypeLabel, saleStateLabel, temperatureLabel } from "../../shared/labels";
import { Banner, Empty, PageHeader, Pagination, Skeleton } from "../../shared/ui/ui";
import { useAuth } from "../auth/AuthContext";
import { CurrentTask, MiniStrip, StateBadge, TempBadge, useAdvisors } from "./parts";

const KEY = "ef_sales_filters";
export function SalesPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const wide = !!user && isManagerOrAdmin(user);
  const advisors = useAdvisors(wide);
  const get = (k: string) => sp.get(k) ?? "";
  const set = (k: string, v: string) => setSp((p) => { v ? p.set(k, v) : p.delete(k); if (k !== "page") p.delete("page"); return p; }, { replace: true });
  const [term, setTerm] = useState(get("q"));

  // Filters are remembered for the session: restore them when the page opens with none.
  useEffect(() => { if (!sp.toString()) { const s = sessionStorage.getItem(KEY); if (s) setSp(new URLSearchParams(s), { replace: true }); } }, []); // eslint-disable-line
  useEffect(() => { sessionStorage.setItem(KEY, sp.toString()); setTerm(get("q")); }, [sp]); // eslint-disable-line
  useEffect(() => { const t = setTimeout(() => term !== get("q") && set("q", term), 300); return () => clearTimeout(t); }, [term]); // eslint-disable-line

  const params = { q: get("q"), state: get("state"), task: get("task"), advisor: get("advisor"), type: get("type"), temperature: get("temperature"), sort: get("sort") || "-createdAt", page: Number(get("page") || 1) };
  const q = useQuery({ queryKey: ["sales", params, user?.id], queryFn: () => salesApi.list(params), placeholderData: keepPreviousData, enabled: !!user });
  const filtered = ["q", "state", "task", "advisor", "type", "temperature"].some((k) => get(k));

  return (
    <>
      <PageHeader title="Ventas" sub={wide ? "Todas las ventas." : "Sus ventas asignadas."}>
        <Link className="btn btn-primary" to="/ventas/nueva">Nueva venta</Link>
      </PageHeader>
      <div className="filters filters-wide">
        <input type="search" placeholder="Buscar cliente, documento, vehículo, serie, VIN o placa" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Buscar ventas" />
        <select value={get("state")} onChange={(e) => set("state", e.target.value)} aria-label="Estado"><option value="">Todos los estados</option>{Object.entries(saleStateLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={get("task")} onChange={(e) => set("task", e.target.value)} aria-label="Tarea actual"><option value="">Cualquier tarea</option>{taskDefs.map((t) => <option key={t.n} value={t.n}>{t.n}. {t.name}</option>)}</select>
        {wide && <select value={get("advisor")} onChange={(e) => set("advisor", e.target.value)} aria-label="Asesor"><option value="">Todos los asesores</option>{advisors.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
        <select value={get("type")} onChange={(e) => set("type", e.target.value)} aria-label="Tipo de cliente"><option value="">Todos los tipos de cliente</option>{Object.entries(customerTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={get("temperature")} onChange={(e) => set("temperature", e.target.value)} aria-label="Temperatura"><option value="">Toda temperatura</option>{Object.entries(temperatureLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={params.sort} onChange={(e) => set("sort", e.target.value === "-createdAt" ? "" : e.target.value)} aria-label="Ordenar"><option value="-createdAt">Más recientes</option><option value="createdAt">Más antiguas</option><option value="customer">Cliente (A–Z)</option></select>
        {filtered && <button className="btn btn-sm" onClick={() => setSp({}, { replace: true })}>Limpiar filtros</button>}
      </div>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {q.isLoading ? <Skeleton /> : q.data && q.data.items.length === 0 ? (
        filtered ? <Empty title="No hay ventas con esos filtros">Pruebe con otra búsqueda o limpie los filtros.</Empty>
          : <Empty title={wide ? "Aún no hay ventas" : "Aún no tiene ventas asignadas"}><Link className="btn btn-primary" to="/ventas/nueva">Nueva venta</Link></Empty>
      ) : q.data && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Venta</th><th>Cliente</th><th>Vehículo</th>{wide && <th>Asesor</th>}<th>Temp.</th><th>Estado</th><th>Avance y tarea actual</th></tr></thead>
              <tbody>
                {q.data.items.map((s) => (
                  <tr key={s.id} className="clickable" tabIndex={0} onClick={() => nav(`/ventas/${s.id}`)} onKeyDown={(e) => e.key === "Enter" && nav(`/ventas/${s.id}`)}>
                    <td><Link to={`/ventas/${s.id}`} onClick={(e) => e.stopPropagation()} className="num">{s.code}</Link><div className="muted small">{fmtDate(s.createdAt)}</div></td>
                    <td>{s.customer.name}<div className="muted small num">{s.customer.docType} {s.customer.docNumber}</div></td>
                    <td>{s.vehicle.model} {s.vehicle.version}<div className="muted small"><i className="swatch" style={{ background: s.vehicle.colorHex }} />{s.vehicle.color}</div></td>
                    {wide && <td>{s.advisor.name}</td>}
                    <td><TempBadge t={s.temperature} /></td>
                    <td><StateBadge s={s.state} /></td>
                    <td><MiniStrip sale={s} /><div className="small"><CurrentTask sale={s} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={q.data.page} pageSize={q.data.pageSize} total={q.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </>
  );
}
