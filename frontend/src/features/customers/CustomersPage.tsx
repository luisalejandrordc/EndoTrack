import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isManagerOrAdmin } from "../../domain/permissions";
import { customersApi } from "../../mock/api";
import { errorMessage } from "../../shared/api/client";
import { customerTypeLabel, docTypeLabel } from "../../shared/labels";
import {
  Badge,
  Banner,
  Empty,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Skeleton,
  useToast,
} from "../../shared/ui/ui";
import { useAuth } from "../auth/AuthContext";
import { CustomerForm, customerDocTypes } from "./CustomerForm";

export function CustomersPage() {
  const { user } = useAuth();
  const qc = useQueryClient(),
    toast = useToast();
  const [sp, setSp] = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";
  const set = (k: string, v: string) =>
    setSp(
      (p) => {
        v ? p.set(k, v) : p.delete(k);
        if (k !== "page") p.delete("page");
        return p;
      },
      { replace: true },
    );
  const [term, setTerm] = useState(get("q"));
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => term !== get("q") && set("q", term), 300);
    return () => clearTimeout(t);
  }, [term]); // eslint-disable-line
  const params = {
    q: get("q"),
    type: get("type"),
    active: get("active"),
    page: Number(get("page") || 1),
  };
  const q = useQuery({
    queryKey: ["customers", params, user?.id],
    queryFn: () => customersApi.list(params),
    placeholderData: keepPreviousData,
    enabled: !!user,
  });
  const toggle = useMutation({
    mutationFn: (c: { id: string; isActive: boolean }) =>
      customersApi.setActive(c.id, !c.isActive),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast(c.isActive ? "Cliente activado." : "Cliente desactivado.");
    },
    onError: (e) => toast(errorMessage(e), "danger"),
  });
  const mgr = !!user && isManagerOrAdmin(user);
  return (
    <>
      <PageHeader
        title="Clientes"
        sub={
          mgr
            ? "Todos los clientes."
            : "Clientes de sus ventas y los que usted registró."
        }
      >
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          Nuevo cliente
        </button>
      </PageHeader>
      <div className="filters">
        <input
          type="search"
          placeholder="Buscar por nombre o documento"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Buscar clientes"
        />
        <select
          value={get("type")}
          onChange={(e) => set("type", e.target.value)}
          aria-label="Tipo"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(customerTypeLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={get("active")}
          onChange={(e) => set("active", e.target.value)}
          aria-label="Estado"
        >
          <option value="">Activos e inactivos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {q.isLoading ? (
        <Skeleton />
      ) : q.data && q.data.items.length === 0 ? (
        <Empty title="No hay clientes con esos filtros">
          Registre un cliente nuevo o cambie la búsqueda.
        </Empty>
      ) : (
        q.data && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Contacto</th>
                    <th className="r">Ventas</th>
                    <th>Estado</th>
                    {mgr && <th />}
                  </tr>
                </thead>
                <tbody>
                  {q.data.items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.displayName}</strong>
                        {c.nameSource === "looked_up" && (
                          <div className="muted small">nombre consultado</div>
                        )}
                      </td>
                      <td className="num">
                        {docTypeLabel[c.docType] ?? c.docType} {c.docNumber}
                      </td>
                      <td>{customerTypeLabel[c.type]}</td>
                      <td>
                        {c.contactFirstName
                          ? `${c.contactFirstName} ${c.contactLastName}`
                          : c.email}
                        <div className="muted small">{c.phone}</div>
                      </td>
                      <td className="r">{c.saleCount}</td>
                      <td>
                        {c.isActive ? (
                          <Badge tone="ok">Activo</Badge>
                        ) : (
                          <Badge>Inactivo</Badge>
                        )}
                      </td>
                      {mgr && (
                        <td className="r">
                          <button
                            className="btn btn-sm"
                            disabled={toggle.isPending}
                            onClick={() => toggle.mutate(c)}
                          >
                            {c.isActive ? "Desactivar" : "Activar"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={q.data.page}
              pageSize={q.data.pageSize}
              total={q.data.total}
              onPage={(p) => set("page", String(p))}
            />
          </>
        )
      )}
      {creating && (
        <NewCustomerModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["customers"] });
            toast("Cliente registrado.");
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function NewCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [docType, setDocType] = useState("DNI"),
    [docNumber, setDocNumber] = useState(""),
    [go, setGo] = useState(false);
  return (
    <Modal title="Nuevo cliente" size="lg" onClose={onClose}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Tipo de documento">
            <select
              value={docType}
              disabled={go}
              onChange={(e) => setDocType(e.target.value)}
            >
              {customerDocTypes.map((d) => (
                <option key={d} value={d}>
                  {docTypeLabel[d]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Número de documento">
            <input
              value={docNumber}
              disabled={go}
              onChange={(e) => setDocNumber(e.target.value)}
            />
          </Field>
        </div>
        {!go ? (
          <div className="form-actions">
            <button className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              disabled={!docNumber.trim()}
              onClick={() => setGo(true)}
            >
              Continuar
            </button>
          </div>
        ) : (
          <CustomerForm
            docType={docType}
            docNumber={docNumber.trim()}
            onCreated={onCreated}
            onCancel={() => setGo(false)}
          />
        )}
      </div>
    </Modal>
  );
}
