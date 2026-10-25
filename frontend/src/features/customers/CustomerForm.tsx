import { useEffect, useState } from "react";
import { customersApi, CustomerInput } from "../../mock/api";
import type { Customer } from "../../domain/types";
import { errorMessage } from "../../shared/api/client";
import { customerTypeLabel } from "../../shared/labels";
import { Badge, Banner, Field, Spinner } from "../../shared/ui/ui";

const b2c = ["diplomatico"], b2b = ["embajada", "entidad_religiosa_catolica", "entidad_religiosa_no_catolica", "organismo_internacional"];
const docRules: Record<string, [RegExp, string]> = {
  DNI: [/^\d{8}$/, "El DNI tiene 8 dígitos."], RUC: [/^\d{11}$/, "El RUC tiene 11 dígitos."], CE: [/^[A-Za-z0-9]{9}$/, "El CE tiene 9 caracteres."],
  PAS: [/^[A-Za-z0-9]{6,12}$/, "El pasaporte tiene de 6 a 12 caracteres."], CDI: [/^[A-Za-z0-9]{8,12}$/, "El CDI tiene de 8 a 12 caracteres."],
};
export const customerDocTypes = ["DNI", "CE", "PAS", "CDI", "RUC"];

/** Creates a customer. DNI and RUC names are looked up first (Codart); if that fails the fields unlock for manual entry. */
export function CustomerForm({ docType, docNumber, onCreated, onCancel }: { docType: string; docNumber: string; onCreated: (c: Customer) => void; onCancel?: () => void }) {
  const isB2B = docType === "RUC";
  const [type, setType] = useState(isB2B ? "embajada" : "diplomatico");
  const [v, setV] = useState<Record<string, string>>({ nationality: "", phone: "", email: "", firstName: "", lastName: "", gender: "F", legalName: "", contactFirstName: "", contactLastName: "", contactJobTitle: "" });
  const [source, setSource] = useState<"manual" | "looked_up">("manual");
  const lookup = docType === "DNI" || docType === "RUC";
  const [looking, setLooking] = useState(lookup);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: string) => setV((x) => ({ ...x, [k]: val }));

  useEffect(() => {
    if (!lookup) return;
    let alive = true;
    customersApi.codart(docType, docNumber).then((r) => { if (alive) { setV((x) => ({ ...x, ...(r as unknown as Record<string, string>) })); setSource("looked_up"); } })
      .catch(() => { if (alive) setSource("manual"); }).finally(() => alive && setLooking(false));
    return () => { alive = false; };
  }, [docType, docNumber, lookup]);

  const locked = source === "looked_up";
  const submit = async () => {
    const e: Record<string, string> = {};
    const [re, msg] = docRules[docType]; if (!re.test(docNumber)) e.doc = msg;
    const need = ["nationality", "phone", "email", ...(isB2B || type !== "diplomatico" ? ["legalName", "contactFirstName", "contactLastName", "contactJobTitle"] : ["firstName", "lastName"])];
    need.forEach((k) => { if (!v[k]?.trim()) e[k] = "Este dato es obligatorio."; });
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Correo no válido.";
    setErrs(e); if (Object.keys(e).length) return;
    setSaving(true); setError("");
    try {
      const input: CustomerInput = { type, docType, docNumber, nationality: v.nationality, phone: v.phone, email: v.email, nameSource: source,
        ...(type === "diplomatico" ? { firstName: v.firstName, lastName: v.lastName, gender: v.gender as "M" | "F" } : { legalName: v.legalName, contactFirstName: v.contactFirstName, contactLastName: v.contactLastName, contactJobTitle: v.contactJobTitle }) };
      onCreated(await customersApi.create(input));
    } catch (er) { setError(errorMessage(er)); setSaving(false); }
  };
  if (looking) return <Spinner label="Consultando el nombre en el registro…" />;
  const types = isB2B ? b2b : b2c;
  const nameBadge = lookup && <Badge tone={locked ? "ok" : "warn"}>{locked ? "consultado" : "ingresado manualmente"}</Badge>;
  return (
    <div className="stack">
      {errs.doc && <Banner tone="danger">{errs.doc}</Banner>}
      {lookup && !locked && <Banner tone="warn">No se pudo consultar el nombre (sin respuesta o cuota mensual agotada). Ingrese los datos manualmente.</Banner>}
      <div className="form-grid">
        <Field label="Tipo de cliente"><select value={type} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t} value={t}>{customerTypeLabel[t]}</option>)}</select></Field>
        <Field label="Nacionalidad" error={errs.nationality}><input value={v.nationality} onChange={(e) => set("nationality", e.target.value)} /></Field>
        {type === "diplomatico" ? (
          <>
            <Field label="Nombres" error={errs.firstName}><input value={v.firstName} readOnly={locked} onChange={(e) => set("firstName", e.target.value)} /></Field>
            <Field label="Apellidos" error={errs.lastName}><input value={v.lastName} readOnly={locked} onChange={(e) => set("lastName", e.target.value)} /></Field>
            <Field label="Género"><select value={v.gender} onChange={(e) => set("gender", e.target.value)}><option value="F">Femenino</option><option value="M">Masculino</option></select></Field>
          </>
        ) : (
          <>
            <Field label="Razón social" error={errs.legalName} className="span-2"><input value={v.legalName} readOnly={locked} onChange={(e) => set("legalName", e.target.value)} /></Field>
            <Field label="Nombres del contacto" error={errs.contactFirstName}><input value={v.contactFirstName} onChange={(e) => set("contactFirstName", e.target.value)} /></Field>
            <Field label="Apellidos del contacto" error={errs.contactLastName}><input value={v.contactLastName} onChange={(e) => set("contactLastName", e.target.value)} /></Field>
            <Field label="Cargo del contacto" error={errs.contactJobTitle}><input value={v.contactJobTitle} onChange={(e) => set("contactJobTitle", e.target.value)} /></Field>
          </>
        )}
        <Field label="Teléfono" error={errs.phone}><input value={v.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Correo" error={errs.email}><input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
      </div>
      <div className="row between">{nameBadge || <span />}
        <div className="row">{onCancel && <button className="btn" onClick={onCancel} disabled={saving}>Cancelar</button>}<button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Guardando…" : "Guardar cliente"}</button></div>
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
    </div>
  );
}
