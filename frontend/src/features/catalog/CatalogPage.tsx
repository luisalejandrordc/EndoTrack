import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { isManagerOrAdmin } from "../../domain/permissions";
import { catalogApi } from "../../mock/api";
import { errorMessage } from "../../shared/api/client";
import { money } from "../../shared/format";
import { Badge, Banner, Empty, Field, Modal, PageHeader, Skeleton, useToast } from "../../shared/ui/ui";
import { useAuth } from "../auth/AuthContext";

export function CatalogPage() {
  const { user } = useAuth();
  const qc = useQueryClient(), toast = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ["catalog"], queryFn: catalogApi.list });
  const archive = useMutation({
    mutationFn: (m: { id: string; archived: boolean }) => catalogApi.setArchived(m.id, !m.archived),
    onSuccess: (m) => { qc.invalidateQueries({ queryKey: ["catalog"] }); toast(m.archived ? "Modelo archivado. Ya no aparece en ventas nuevas." : "Modelo restaurado."); },
    onError: (e) => toast(errorMessage(e), "danger"),
  });
  const edit = !!user && isManagerOrAdmin(user);
  const models = q.data?.filter((m) => showArchived || !m.archived) ?? [];
  return (
    <>
      <PageHeader title="Catálogo" sub={edit ? "Modelos, versiones y colores disponibles para ventas nuevas." : "Consulta de los modelos disponibles."}>
        <label className="check"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Mostrar archivados</label>
        {edit && <button className="btn btn-primary" onClick={() => setCreating(true)}>Nuevo modelo</button>}
      </PageHeader>
      {q.isError && <Banner tone="danger">{errorMessage(q.error)}</Banner>}
      {q.isLoading ? <Skeleton /> : models.length === 0 ? <Empty title="No hay modelos para mostrar" /> : (
        <div className="cards">
          {models.map((m) => (
            <article key={m.id} className={`card model${m.archived ? " is-archived" : ""}`}>
              <div className="row between"><h2>{m.name}</h2>{m.archived && <Badge>Archivado</Badge>}</div>
              <p className="muted small">{m.categories.join(" · ")}</p>
              <div className="swatches">{m.colors.map((c) => <span key={c.id} className="swatch-chip" title={c.name}><i className="swatch" style={{ background: c.hex }} />{c.name}</span>)}</div>
              <ul className="plain versions">{m.versions.map((v) => <li key={v.id}><span>{v.name}</span><span className="num">{money(v.price)}</span></li>)}</ul>
              {edit && <button className="btn btn-sm" disabled={archive.isPending} onClick={() => archive.mutate(m)}>{m.archived ? "Restaurar modelo" : "Archivar modelo"}</button>}
            </article>
          ))}
        </div>
      )}
      {creating && <NewModelModal onClose={() => setCreating(false)} onDone={() => { qc.invalidateQueries({ queryKey: ["catalog"] }); toast("Modelo creado."); setCreating(false); }} />}
    </>
  );
}

function NewModelModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ name: "", category: "", versionName: "", price: "", colorName: "", colorHex: "#888888" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k: string, val: string) => setV((x) => ({ ...x, [k]: val }));
  const valid = v.name.trim() && v.category.trim() && v.versionName.trim() && /^\d+(\.\d{1,2})?$/.test(v.price) && v.colorName.trim();
  const go = async () => { setBusy(true); setErr(""); try { await catalogApi.create({ ...v, name: v.name.trim() }); onDone(); } catch (e) { setErr(errorMessage(e)); setBusy(false); } };
  return (
    <Modal title="Nuevo modelo" size="lg" onClose={onClose} footer={<><button className="btn" onClick={onClose} disabled={busy}>Cancelar</button><button className="btn btn-primary" disabled={!valid || busy} onClick={go}>{busy ? "Guardando…" : "Crear modelo"}</button></>}>
      <div className="stack">
        <p className="muted">Un modelo necesita su primera versión y su primer color. Se guardan juntos.</p>
        <div className="form-grid">
          <Field label="Modelo"><input value={v.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Categoría"><input value={v.category} onChange={(e) => set("category", e.target.value)} placeholder="SUV, Pickup…" /></Field>
          <Field label="Primera versión"><input value={v.versionName} onChange={(e) => set("versionName", e.target.value)} /></Field>
          <Field label="Precio de referencia (USD)"><input className="num" inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="Primer color"><input value={v.colorName} onChange={(e) => set("colorName", e.target.value)} /></Field>
          <Field label="Tono"><input type="color" value={v.colorHex} onChange={(e) => set("colorHex", e.target.value)} /></Field>
        </div>
        <Banner tone="info">La imagen de vista principal se sube cuando el módulo de documentos esté disponible (fase 1F).</Banner>
        {err && <Banner tone="danger">{err}</Banner>}
      </div>
    </Modal>
  );
}
