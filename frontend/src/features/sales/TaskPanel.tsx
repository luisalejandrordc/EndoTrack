import { ReactNode, useEffect, useRef, useState } from "react";
import { canAct, isEligible, isLatestCompleted, isManagerOrAdmin } from "../../domain/permissions";
import { comparisons, derived, DocDef, FieldDef, isLocked, mismatches, taskDefs, validateTask } from "../../domain/taskDefs";
import type { Sale, TaskInstance } from "../../domain/types";
import { salesApi } from "../../mock/api";
import { ApiError } from "../../shared/api/client";
import { fmtDate, fmtDateTime, money } from "../../shared/format";
import { Badge, Banner, ConfirmModal, Field, ReasonModal, useToast, useUnsavedWarning } from "../../shared/ui/ui";
import { useAuth } from "../auth/AuthContext";
import { useSaleCache } from "./hooks";

const MAX_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------- document row
export function DocRow({ sale, task, def }: { sale: Sale; task: TaskInstance; def: DocDef }) {
  const { user } = useAuth();
  const apply = useSaleCache(sale.id);
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const file = task.docs[def.key];
  const mgr = !!user && isManagerOrAdmin(user);
  const actor = !!user && canAct(user, sale);
  const inProgress = task.status === "in_progress" && actor && sale.state === "active";
  const replaceWithReason = task.status === "completed" && mgr && sale.state !== "cancelled";
  const notRequired = def.requiredUnless?.({ sale, n: task.n, data: task.data });
  const accept = def.kind === "pdf" ? ".pdf,application/pdf" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const pick = (f?: File) => {
    if (!f) return;
    setError("");
    const okType = def.kind === "pdf" ? f.type === "application/pdf" || /\.pdf$/i.test(f.name) : /\.xlsx$/i.test(f.name);
    if (!okType) return setError(def.kind === "pdf" ? "Solo se aceptan archivos PDF." : "Solo se aceptan archivos Excel (.xlsx).");
    if (f.size > MAX_BYTES) return setError("El archivo supera los 10 MB.");
    if (replaceWithReason) setPending(f); else send(f);
  };
  const send = async (f: File, reason?: string) => {
    setBusy(true);
    try { apply(await salesApi.upload(sale.id, task.n, def.key, { name: f.name, size: f.size }, reason)); toast("Documento guardado."); }
    catch (e) { setError((e as Error).message); throw e; }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return (
    <div className="doc-row">
      <div className="doc-main">
        <strong>{def.label}</strong>
        <div className="row wrap">
          <Badge tone={def.visible ? "info" : "neutral"}>{def.visible ? "Visible para el cliente" : "Interno"}</Badge>
          {file ? <Badge tone="ok">Subido</Badge> : notRequired ? <Badge>No requerido</Badge> : <Badge tone="warn">Falta</Badge>}
        </div>
        {file ? <div className="muted small">{file.name} · {(file.size / 1024).toFixed(0)} KB · {fmtDateTime(file.uploadedAt)}</div>
          : (inProgress || replaceWithReason) && <div className="muted small">{def.kind === "pdf" ? "PDF" : "Excel (.xlsx)"} · máximo 10 MB</div>}
        {error && <small className="err">{error}</small>}
      </div>
      <div className="row">
        {(inProgress || replaceWithReason) && <>
          <input ref={input} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
          <button className="btn btn-sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Subiendo…" : file ? "Reemplazar" : "Subir"}</button>
        </>}
        {file && inProgress && <button className="btn btn-sm btn-danger-ghost" disabled={busy} onClick={async () => { try { apply(await salesApi.removeDoc(sale.id, task.n, def.key)); } catch (e) { setError((e as Error).message); } }}>Quitar</button>}
        {file && <button className="btn btn-sm" onClick={() => toast("La descarga se activará con el módulo de documentos (fase 1F).", "info")}>Descargar</button>}
      </div>
      {pending && <ReasonModal title="Reemplazar documento" label="Motivo del reemplazo" confirmLabel="Reemplazar" message={`Se reemplazará «${def.label}» en una tarea ya completada. El cambio queda en la auditoría.`}
        onClose={() => setPending(null)} onConfirm={({ reason }) => send(pending, reason)} />}
    </div>
  );
}

// ---------------------------------------------------------------- field input
function FieldInput({ def, value, onChange, disabled, locked, required }: { def: FieldDef; value: string; onChange: (v: string) => void; disabled: boolean; locked: boolean; required: boolean }) {
  const label = `${def.label}${required ? " *" : ""}`;
  const hint = locked ? undefined : def.hint;
  let control: ReactNode;
  if (def.type === "select") control = <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}><option value="">Seleccione…</option>{def.options!.map((o) => <option key={o}>{o}</option>)}</select>;
  else if (def.type === "textarea") control = <textarea rows={3} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  else if (def.type === "date") control = <input type="date" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  else control = <input inputMode={def.type === "money" ? "decimal" : "text"} className={def.type === "money" ? "num" : ""} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  return (
    <div className={locked ? "locked" : ""} title={locked ? "Bloqueado: hay tareas posteriores completadas. Reabra primero esas tareas en orden inverso." : undefined}>
      <Field label={locked ? `🔒 ${label}` : label} hint={locked ? "Bloqueado: hay tareas posteriores completadas." : hint}>{control}</Field>
    </div>
  );
}

// ---------------------------------------------------------------- task body
export function TaskBody({ sale, task }: { sale: Sale; task: TaskInstance }) {
  const { user } = useAuth();
  const apply = useSaleCache(sale.id);
  const toast = useToast();
  const n = task.n, def = taskDefs[n - 1];
  const [draft, setDraft] = useState<Record<string, string>>(task.data);
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<null | "start" | "complete" | "restart" | "reopen" | "edit">(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sig = JSON.stringify(task.data);
  useEffect(() => { setDraft(task.data); setEditing(false); setProblems([]); setError(""); }, [task.status, task.startedAt, task.completedAt, sig]); // eslint-disable-line
  const dirty = JSON.stringify(draft) !== sig;
  useUnsavedWarning(dirty);
  if (!user) return null;

  const active = sale.state === "active", actor = canAct(user, sale), mgr = isManagerOrAdmin(user);
  const inProg = task.status === "in_progress";
  const eligible = isEligible(sale, task);
  const hasData = Object.values(task.data).some(Boolean) || Object.keys(task.docs).length > 0;
  const editable = (inProg && actor && active) || editing;
  const ctx = { sale, n, data: draft };
  const comps = comparisons(sale, n, draft).filter((c) => c.entered);
  const live = validateTask(sale, n, draft, task.docs, []);
  const d = derived(sale, { n, data: draft });

  const run = async (fn: () => Promise<Sale>, ok: string) => {
    setBusy(true); setError("");
    try { apply(await fn()); toast(ok); } catch (e) { setError((e as Error).message); throw e; } finally { setBusy(false); }
  };
  const complete = async () => {
    try { apply(await salesApi.complete(sale.id, n, draft)); toast(n === 13 ? "Tarea 13 completada. La venta quedó completada." : `Tarea ${n} completada. La tarea ${n + 1} está lista para iniciar.`); setProblems([]); }
    catch (e) { if (e instanceof ApiError && e.code === "TASK_INCOMPLETE") { setProblems(e.fields.map((f) => f.message)); } else throw e; }
  };
  const reopenWhy = sale.state === "completed" && n !== 13 ? "En una venta completada solo se puede reabrir la tarea 13."
    : sale.tasks.some((t) => t.status === "in_progress") ? "Reinicie primero la tarea que está en curso." : !isLatestCompleted(sale, task) ? `Reabra primero la tarea ${n + 1}.` : "";

  // group the visible fields so related inputs sit together (the four invoices of task 6)
  const groups: { name?: string; fields: FieldDef[] }[] = [];
  def.fields.filter((f) => !f.showWhen || f.showWhen(ctx)).forEach((f) => { const g = groups.find((x) => x.name === f.group); g ? g.fields.push(f) : groups.push({ name: f.group, fields: [f] }); });

  if (task.status === "pending" && !eligible && !hasData)
    return <div className="task-body"><Banner tone="info">Primero debe completarse la tarea {n - 1}.</Banner></div>;

  return (
    <div className="task-body stack">
      {task.status === "pending" && hasData && <Banner tone="info">Datos conservados. Se podrán editar cuando la tarea vuelva a iniciarse.</Banner>}
      {n === 1 && editable && d.quoted !== null && <div className="calc">Precio final cotizado (suma de los cuatro montos): <strong>{money(d.quoted)}</strong></div>}
      {n === 3 && d.finalCommission !== null && <div className={`calc${d.finalCommission <= 0 ? " calc-bad" : ""}`}>Comisión final calculada: <strong>{money(d.finalCommission)}</strong>{d.finalCommission <= 0 && " — debe ser mayor que cero"}</div>}

      {groups.map((g, i) => {
        const body = <div className="form-grid">{g.fields.map((f) => (
          <FieldInput key={f.key} def={f} value={draft[f.key] ?? ""} onChange={(v) => setDraft((x) => ({ ...x, [f.key]: v }))}
            disabled={!editable || isLocked(sale, n, f)} locked={editing && isLocked(sale, n, f)} required={!f.optional && (f.requiredWhen ? f.requiredWhen(ctx) : true)} />
        ))}</div>;
        return g.name ? <fieldset key={i} className="group"><legend>{g.name}</legend>{body}</fieldset> : <div key={i}>{body}</div>;
      })}

      {comps.length > 0 && (
        <table className="table compare" aria-label="Verificación de montos">
          <thead><tr><th>Concepto</th><th className="r">Esperado</th><th className="r">Ingresado</th><th>Resultado</th></tr></thead>
          <tbody>{comps.map((c) => {
            const same = c.expected !== null && mismatches(sale, n, draft).every((m) => m.key !== c.key);
            return <tr key={c.key}><td>{c.label}</td><td className="r num">{c.expected === null ? "—" : money(c.expected)}</td><td className="r num">{money(c.entered)}</td><td>{same ? <Badge tone="ok">✓ Coincide</Badge> : <Badge tone="warn">≠ Difiere: indique el motivo</Badge>}</td></tr>;
          })}</tbody>
        </table>
      )}

      {def.docs.length > 0 && <div className="doc-list">{def.docs.map((dd) => <DocRow key={dd.key} sale={sale} task={task} def={dd} />)}</div>}

      {(editable || task.notes) && (
        <Field label="Notas de la tarea (internas)">
          <textarea rows={2} defaultValue={task.notes} disabled={!(actor && active && (inProg || mgr))} onBlur={async (e) => { if (e.target.value !== task.notes) { try { apply(await salesApi.saveTaskNotes(sale.id, n, e.target.value)); } catch { /* shown on next save */ } } }} />
        </Field>
      )}

      {editable && live.warnings.map((w) => <Banner key={w} tone="warn">{w}</Banner>)}
      {problems.length > 0 && <Banner tone="danger"><strong>No se puede completar la tarea {n}. Corrija lo siguiente:</strong><ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul></Banner>}
      {error && <Banner tone="danger">{error}</Banner>}

      <div className="row wrap task-actions">
        {task.status === "pending" && eligible && active && (actor
          ? <button className="btn btn-primary" disabled={busy} onClick={() => setModal("start")}>Iniciar tarea</button>
          : <span className="muted">Solo el asesor asignado, un Gerente o un Administrador puede iniciar esta tarea.</span>)}
        {inProg && active && actor && <>
          <button className="btn" disabled={busy || !dirty} onClick={() => run(() => salesApi.saveData(sale.id, n, draft), "Borrador guardado.").catch(() => {})}>Guardar borrador</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => setModal("complete")}>Completar tarea</button>
          {mgr && <button className="btn btn-danger-ghost" disabled={busy} onClick={() => setModal("restart")}>Reiniciar tarea</button>}
        </>}
        {task.status === "completed" && mgr && sale.state !== "cancelled" && !editing && <>
          <button className="btn" onClick={() => setEditing(true)}>Editar</button>
          <button className="btn" disabled={!!reopenWhy} title={reopenWhy} onClick={() => setModal("reopen")}>Reabrir tarea</button>
          {reopenWhy && <span className="muted small">{reopenWhy}</span>}
        </>}
        {editing && <>
          <button className="btn btn-primary" disabled={busy || !dirty} onClick={() => setModal("edit")}>Guardar cambios</button>
          <button className="btn" disabled={busy} onClick={() => { setEditing(false); setDraft(task.data); }}>Cancelar edición</button>
        </>}
      </div>

      {modal === "start" && <ConfirmModal title={`Iniciar tarea ${n}`} confirmLabel="Iniciar tarea" onClose={() => setModal(null)} message={`Va a iniciar la tarea ${n} (${def.name}).${def.durationDays ? ` Tiene un plazo recomendado de ${def.durationDays} días.` : ""}`} onConfirm={() => run(() => salesApi.start(sale.id, n), `Tarea ${n} iniciada.`)} />}
      {modal === "complete" && <ConfirmModal title={`Completar tarea ${n}`} confirmLabel="Completar tarea" onClose={() => setModal(null)} message={`Va a completar la tarea ${n}. ${n < 13 ? `Esta acción habilita la tarea ${n + 1}.` : "Esta acción completa la venta."}`} onConfirm={complete} />}
      {modal === "restart" && <ReasonModal title={`Reiniciar tarea ${n}`} confirmLabel="Reiniciar tarea" danger onClose={() => setModal(null)} message="La tarea vuelve a pendiente. Los datos y archivos se conservan en solo lectura y el plazo se calculará de nuevo al reiniciarla." onConfirm={({ reason }) => run(() => salesApi.restart(sale.id, n, reason), `Tarea ${n} reiniciada.`)} />}
      {modal === "reopen" && <ReasonModal title={`Reabrir tarea ${n}`} confirmLabel="Reabrir tarea" onClose={() => setModal(null)} message={`La tarea vuelve a estar en curso${n === 13 ? " y la venta deja de estar completada" : n < 13 ? `; la tarea ${n + 1} dejará de estar disponible` : ""}.`} onConfirm={({ reason }) => run(() => salesApi.reopenTask(sale.id, n, reason), `Tarea ${n} reabierta.`)} />}
      {modal === "edit" && <ReasonModal title={`Editar tarea ${n} completada`} label="Motivo de la edición" confirmLabel="Guardar cambios" onClose={() => setModal(null)} message="El cambio queda registrado en el historial con el antes y el después." onConfirm={({ reason }) => run(() => salesApi.editCompleted(sale.id, n, draft, reason), "Cambios guardados.")} />}
    </div>
  );
}

export const taskDates = (t: TaskInstance) =>
  t.status === "completed" ? `Completada el ${fmtDate(t.completedAt)}` : t.status === "in_progress" ? `Iniciada el ${fmtDate(t.startedAt)}` : "";
