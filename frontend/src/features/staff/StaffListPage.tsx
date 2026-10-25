import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { staffApi } from "../../shared/api/api";
import { errorMessage } from "../../shared/api/client";
import type { Employee, Role } from "../../shared/api/types";
import { roleLabel } from "../../shared/labels";
import { fullName } from "../../shared/format";
import { Badge, Banner, Empty, PageHeader, Pagination, Skeleton } from "../../shared/ui/ui";

export const employeeStatus = (e: Employee) =>
  !e.isActive ? <Badge tone="neutral">Inactivo</Badge> : !e.activatedAt ? <Badge tone="warn" title="Aún no definió su contraseña">Pendiente de activación</Badge> : <Badge tone="ok">Activo</Badge>;

export function StaffListPage() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const q = sp.get("q") ?? "";
  const role = (sp.get("role") ?? "") as Role | "";
  const status = (sp.get("status") ?? "all") as "all" | "active" | "inactive";
  const page = Number(sp.get("page") ?? 1);
  const sort = sp.get("sort") ?? "lastName";
  const [term, setTerm] = useState(q);
  const set = (k: string, v: string) => setSp((p) => { v ? p.set(k, v) : p.delete(k); if (k !== "page") p.delete("page"); return p; }, { replace: true });
  useEffect(() => { const t = setTimeout(() => term !== q && set("q", term), 300); return () => clearTimeout(t); }, [term]); // eslint-disable-line

  const query = useQuery({
    queryKey: ["employees", { q, role, status, page, sort }],
    queryFn: () => staffApi.list({ q, role, status, page, pageSize: 20, sort }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Empleados" sub="Personal con acceso al sistema. Solo los administradores ven esta sección.">
        <Link className="btn btn-primary" to="/empleados/nuevo">Nuevo empleado</Link>
      </PageHeader>
      <div className="filters">
        <input type="search" placeholder="Buscar por nombre, documento o correo" value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Buscar empleados" />
        <select value={role} onChange={(e) => set("role", e.target.value)} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </select>
        <select value={status} onChange={(e) => set("status", e.target.value === "all" ? "" : e.target.value)} aria-label="Filtrar por estado">
          <option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
        </select>
        <select value={sort} onChange={(e) => set("sort", e.target.value === "lastName" ? "" : e.target.value)} aria-label="Ordenar">
          <option value="lastName">Apellido (A–Z)</option><option value="-lastName">Apellido (Z–A)</option><option value="-createdAt">Más recientes</option><option value="createdAt">Más antiguos</option>
        </select>
      </div>
      {query.isError && <Banner tone="danger">{errorMessage(query.error)}</Banner>}
      {query.isLoading ? <Skeleton /> : query.data && query.data.items.length === 0 ? (
        <Empty title="No hay empleados con esos filtros">Cambie la búsqueda o cree un empleado nuevo.</Empty>
      ) : query.data && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Empleado</th><th>Documento</th><th>Rol</th><th>Correo corporativo</th><th>Estado</th></tr></thead>
              <tbody>
                {query.data.items.map((e) => (
                  <tr key={e.id} className="clickable" tabIndex={0} onClick={() => nav(`/empleados/${e.id}`)} onKeyDown={(ev) => ev.key === "Enter" && nav(`/empleados/${e.id}`)}>
                    <td><Link to={`/empleados/${e.id}`} onClick={(ev) => ev.stopPropagation()}>{fullName(e)}</Link></td>
                    <td className="num">{e.documentType} {e.documentNumber}</td>
                    <td>{roleLabel[e.role]}</td>
                    <td>{e.businessEmail}</td>
                    <td>{employeeStatus(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </>
  );
}
