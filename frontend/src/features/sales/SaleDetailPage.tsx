import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { NotFoundPage } from "../../app/NotFound";
import { canAct, canDeleteSale, canReassign, cancelRule, currentTaskNumber, reopenSaleRule } from "../../domain/permissions";
import { derived, taskDefs } from "../../domain/taskDefs";
import type { Sale } from "../../domain/types";
import { salesApi } from "../../mock/api";
import { ApiError, errorMessage } from "../../shared/api/client";
import { fmtDateTime, money } from "../../shared/format";
import { cancelCategories, customerTypeLabel, docTypeLabel, taskStatusLabel, temperatureLabel } from "../../shared/labels";
import { Badge, Banner, Empty, Field, Modal, ReasonModal, Skeleton, useToast, useUnsavedWarning } from "../../shared/ui/ui";
import { useAuth } from "../auth/AuthContext";
import { useSaleCache } from "./hooks";
import { CurrentTask, StateBadge, TempBadge, useAdvisors } from "./parts";
import { ProgressStrip } from "./ProgressStrip";
import { DocRow, TaskBody, taskDates } from "./TaskPanel";

const tabs = [["resumen", "Resumen"], ["tareas", "Tareas"], ["documentos", "Documentos"], ["notas", "Notas"], ["historial", "Historial"]] as const;

export function SaleDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const apply = useSaleCache(id);
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") ?? "tareas";
  const q = useQuery({ queryKey: ["sale", id], queryFn: () => salesApi.get(id), enabled: !!user, retry: false });
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<null | "cancel" | "reopen" | "reassign" | "delete">(null);
  const sale = q.data;

  // The current task starts expanded.
  const cur = sale ? currentTaskNumber(sale) : null;
  useEffect(() => { if (cur) setOpen((o) => (o.size ? o : new Set([cur]))); }, [cur]);

  if (q.isLoading) return <Skeleton rows={8} />;
  if (q.isError || !sale || !user) return q.error instanceof ApiError && q.error.status !== 404 ? <Banner tone="danger">{errorMessage(q.error)}</Banner> : <NotFoundPage />;

  const cancel = cancelRule(user, sale), reopen = reopenSaleRule(user, sale);
  const setTab = (t: string) => setSp((p) => { p.set("tab", t); return p; }, { replace: true });
  const select = (n: number) => { setTab("tareas"); setOpen((o) => new Set(o).add(n)); setTimeout(() => document.getElementById(`task-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); };
  const d = derived(sale);

  return (
    <>
      <p className="crumb"><Link to="/ventas">← Ventas</Link></p>
      <header className="sale-head">
        <div className="sale-title">
          <span className="num muted">{sale.code}</span>
          <h1>{sale.customer.name}</h1>
          <p className="muted">{docTypeLabel[sale.customer.docType] ?? sale.customer.docType} {sale.customer.docNumber} · {customerTypeLabel[sale.customer.type]}</p>
        </div>
        <div className="sale-vehicle"><i className="swatch swatch-lg" style={{ background: sale.vehicle.colorHex }} /><div><strong>{sale.vehicle.model} {sale.vehicle.version}</strong><div className="muted">{sale.vehicle.color}</div></div></div>
        <div className="sale-meta">
          <div className="row wrap"><StateBadge s={sale.state} /><TempBadge t={sale.temperature} /></div>
          <div className="small">Asesor: <strong>{sale.advisor.name}</strong></div>
          <div className="small"><CurrentTask sale={sale} /></div>
        </div>
        <details className="menu">
          <summary className="btn">Acciones</summary>
          <div className="menu-list" onClick={(e) => (e.currentTarget.parentElement as HTMLDetailsElement).removeAttribute("open")}>
            {canReassign(user, sale) && <button onClick={() => setModal("reassign")}>Reasignar asesor</button>}
            {sale.state === "active" && <button disabled={!cancel.allowed} onClick={() => setModal("cancel")} title={cancel.why}>Cancelar venta{!cancel.allowed && cancel.why ? <small>{cancel.why}</small> : null}</button>}
            {sale.state === "cancelled" && <button disabled={!reopen.allowed} onClick={() => setModal("reopen")} title={reopen.why}>Reabrir venta{!reopen.allowed && reopen.why ? <small>{reopen.why}</small> : null}</button>}
            {canDeleteSale(user, sale) && <button className="danger" onClick={() => setModal("delete")}>Eliminar venta</button>}
            {!canReassign(user, sale) && !cancel.allowed && !reopen.allowed && !canDeleteSale(user, sale) && <span className="menu-empty">No hay acciones disponibles.</span>}
          </div>
        </details>
      </header>

      {sale.state === "cancelled" && sale.cancellation && <Banner tone="neutral"><strong>Venta cancelada</strong> en la tarea {sale.cancellation.atTask}: {cancelCategories.find((c) => c.value === sale.cancellation!.category)?.label ?? sale.cancellation.category}.{sale.cancellation.text && ` ${sale.cancellation.text}`} Todo queda en solo lectura. El cliente verá únicamente «Cancelada».</Banner>}
      {sale.state === "completed" && <Banner tone="ok"><strong>Venta completada.</strong> La unidad fue entregada. Solo se puede reabrir la tarea 13, con un motivo.</Banner>}

      <ProgressStrip sale={sale} onSelect={select} />

      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "resumen" && (
        <div className="grid-2 align-start">
          <section className="card"><h2>Venta</h2>
            <dl className="dl">
              <dt>Estado</dt><dd><StateBadge s={sale.state} /></dd><dt>Temperatura</dt><dd>{temperatureLabel[sale.temperature]}</dd>
              <dt>Asesor</dt><dd>{sale.advisor.name}</dd><dt>Creada</dt><dd>{fmtDateTime(sale.createdAt)} por {sale.createdBy}</dd>
              <dt>Tarea actual</dt><dd><CurrentTask sale={sale} /></dd>
            </dl></section>
          <section className="card"><h2>Vehículo y valores</h2>
            <dl className="dl">
              <dt>Vehículo</dt><dd>{sale.vehicle.model} {sale.vehicle.version}, {sale.vehicle.color}</dd>
              <dt>Precio de referencia</dt><dd className="num">{money(sale.vehicle.price)}</dd>
              <dt>Precio final cotizado</dt><dd className="num">{money(d.quoted)}</dd>
              <dt>Monto final Toyota</dt><dd className="num">{money(d.finalToyota)}</dd>
              <dt>Comisión final</dt><dd className="num">{money(d.finalCommission)}</dd>
            </dl>
            <p className="hint">Los valores finales aparecen al completar las tareas 1 y 3. Son internos.</p></section>
        </div>
      )}

      {tab === "tareas" && (
        <div className="accordion">
          {sale.tasks.map((t) => {
            const isOpen = open.has(t.n), def = taskDefs[t.n - 1];
            return (
              <section key={t.n} id={`task-${t.n}`} className={`acc acc-${t.status}${t.n === cur ? " is-current" : ""}`}>
                <button className="acc-head" aria-expanded={isOpen} onClick={() => setOpen((o) => { const x = new Set(o); x.has(t.n) ? x.delete(t.n) : x.add(t.n); return x; })}>
                  <span className={`acc-num acc-num-${t.status}`}>{t.status === "completed" ? "✓" : t.n}</span>
                  <span className="acc-title"><strong>{def.name}</strong><span className="muted small">{taskDates(t)}</span></span>
                  <Badge tone={t.status === "completed" ? "ok" : t.status === "in_progress" ? "warn" : "neutral"}>{taskStatusLabel[t.status]}</Badge>
                  <span className="chev" aria-hidden>{isOpen ? "▾" : "▸"}</span>
                </button>
                {isOpen && <TaskBody sale={sale} task={t} />}
              </section>
            );
          })}
        </div>
      )}

      {tab === "documentos" && (
        <div className="stack">
          {taskDefs.filter((df) => df.docs.length).map((df) => (
            <section className="card" key={df.n}><h2>Tarea {df.n}: {df.name}</h2><div className="doc-list">{df.docs.map((dd) => <DocRow key={dd.key} sale={sale} task={sale.tasks[df.n - 1]} def={dd} />)}</div></section>
          ))}
        </div>
      )}

      {tab === "notas" && <NotesTab sale={sale} canEdit={canAct(user, sale) && sale.state !== "cancelled"} />}
      {tab === "historial" && <HistoryTab sale={sale} />}

      {modal === "cancel" && <ReasonModal title="Cancelar venta" confirmLabel="Cancelar venta" danger categories={cancelCategories} onClose={() => setModal(null)}
        message="Las tareas quedan congeladas en solo lectura. La serie, el VIN y la placa vuelven a estar disponibles; los números de operación y de factura siguen reservados."
        onConfirm={async ({ reason, category }) => { apply(await salesApi.cancel(sale.id, { category: category!, reason })); toast("Venta cancelada."); }} />}
      {modal === "reopen" && <ReasonModal title="Reabrir venta" confirmLabel="Reabrir venta" onClose={() => setModal(null)}
        message="La venta vuelve a estar activa. Si la serie, el VIN o la placa ya están en otra venta activa o completada, no se podrá reabrir."
        onConfirm={async ({ reason }) => { apply(await salesApi.reopenSale(sale.id, reason)); toast("Venta reabierta."); }} />}
      {modal === "reassign" && <ReassignModal sale={sale} onClose={() => setModal(null)} onDone={(s) => { apply(s); toast("Asesor reasignado."); }} />}
      {modal === "delete" && <DeleteModal sale={sale} onClose={() => setModal(null)} onDone={() => { toast("Venta eliminada."); nav("/ventas", { replace: true }); }} />}
    </>
  );
}

function NotesTab({ sale, canEdit }: { sale: Sale; canEdit: boolean }) {
  const apply = useSaleCache(sale.id), toast = useToast();
  const [v, setV] = useState(sale.notes);
  const [err, setErr] = useState("");
  useUnsavedWarning(v !== sale.notes);
  const withNotes = sale.tasks.filter((t) => t.notes);
  return (
    <div className="stack">
      <section className="card stack"><h2>Notas de la venta</h2><p className="muted">Solo las ve el personal. Nunca llegan al cliente.</p>
        <Field label="Notas internas"><textarea rows={5} value={v} disabled={!canEdit} onChange={(e) => setV(e.target.value)} /></Field>
        {err && <Banner tone="danger">{err}</Banner>}
        {canEdit && <div><button className="btn btn-primary" disabled={v === sale.notes} onClick={async () => { try { apply(await salesApi.saveNotes(sale.id, v)); toast("Notas guardadas."); setErr(""); } catch (e) { setErr(errorMessage(e)); } }}>Guardar notas</button></div>}
      </section>
      <section className="card"><h2>Notas por tarea</h2>
        {withNotes.length === 0 ? <p className="muted">Ninguna tarea tiene notas. Se escriben dentro de cada tarea.</p> : <ul className="plain">{withNotes.map((t) => <li key={t.n}><strong>Tarea {t.n}: {taskDefs[t.n - 1].name}</strong><div>{t.notes}</div></li>)}</ul>}
      </section>
    </div>
  );
}

function HistoryTab({ sale }: { sale: Sale }) {
  const [kind, setKind] = useState("");
  const items = sale.history.filter((h) => !kind || h.kind === kind);
  return (
    <section className="card stack">
      <div className="row between"><h2>Historial</h2>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filtrar historial"><option value="">Todo</option><option value="task">Tareas</option><option value="document">Documentos</option><option value="sale">Venta</option><option value="advisor">Asesor</option></select></div>
      {items.length === 0 ? <Empty title="Sin eventos para este filtro" /> : (
        <ol className="timeline">{items.map((h) => (
          <li key={h.id}><div className="tl-dot" /><div><div>{h.text}</div>{h.reason && <div className="tl-reason">Motivo: {h.reason}</div>}<div className="muted small">{fmtDateTime(h.at)} · {h.actor}</div></div></li>
        ))}</ol>
      )}
    </section>
  );
}

function ReassignModal({ sale, onClose, onDone }: { sale: Sale; onClose: () => void; onDone: (s: Sale) => void }) {
  const advisors = useAdvisors();
  const [to, setTo] = useState(""), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const options = advisors.data?.filter((a) => a.id !== sale.advisor.id) ?? [];
  const go = async () => {
    const a = options.find((x) => x.id === to)!; setBusy(true); setErr("");
    try { onDone(await salesApi.reassign(sale.id, a, note.trim())); onClose(); } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };
  return (
    <Modal title="Reasignar asesor" onClose={onClose} footer={<><button className="btn" onClick={onClose} disabled={busy}>Volver</button><button className="btn btn-primary" onClick={go} disabled={!to || busy}>{busy ? "Procesando…" : "Reasignar"}</button></>}>
      <div className="stack">
        <p>{sale.advisor.name} perderá el acceso a esta venta de inmediato y el nuevo asesor la verá en su lista.</p>
        <Field label="Nuevo asesor"><select value={to} onChange={(e) => setTo(e.target.value)}><option value="">Seleccione…</option>{options.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Nota (opcional)"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {err && <Banner tone="danger">{err}</Banner>}
      </div>
    </Modal>
  );
}

function DeleteModal({ sale, onClose, onDone }: { sale: Sale; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(""), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const go = async () => { setBusy(true); setErr(""); try { await salesApi.remove(sale.id, reason.trim()); onDone(); } catch (e) { setErr(errorMessage(e)); setBusy(false); } };
  return (
    <Modal title="Eliminar venta" onClose={onClose} footer={<><button className="btn" onClick={onClose} disabled={busy}>Volver</button><button className="btn btn-danger" onClick={go} disabled={busy || code !== sale.code || !reason.trim()}>Eliminar definitivamente</button></>}>
      <div className="stack">
        <p>Es excepcional y no se puede deshacer: se borran la venta y sus archivos. Solo para ventas de prueba o corruptas que nunca llegaron a la entrega. La auditoría se conserva.</p>
        <Field label={`Escriba ${sale.code} para confirmar`}><input value={code} onChange={(e) => setCode(e.target.value)} /></Field>
        <Field label="Motivo"><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        {err && <Banner tone="danger">{err}</Banner>}
      </div>
    </Modal>
  );
}
