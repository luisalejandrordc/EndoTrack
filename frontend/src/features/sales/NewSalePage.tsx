import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isManagerOrAdmin } from "../../domain/permissions";
import type { Customer } from "../../domain/types";
import { catalogApi, customersApi, salesApi } from "../../mock/api";
import { errorMessage } from "../../shared/api/client";
import { money } from "../../shared/format";
import {
  customerTypeLabel,
  docTypeLabel,
  Temperature,
  temperatureHint,
  temperatureLabel,
} from "../../shared/labels";
import {
  Badge,
  Banner,
  Field,
  PageHeader,
  Spinner,
  useToast,
  useUnsavedWarning,
} from "../../shared/ui/ui";
import { useAuth } from "../auth/AuthContext";
import { CustomerForm, customerDocTypes } from "../customers/CustomerForm";
import { useAdvisors } from "./parts";

const steps = ["Cliente", "Vehículo", "Datos de la venta", "Revisión"];

export function NewSalePage() {
  const { user } = useAuth();
  const nav = useNavigate(),
    qc = useQueryClient(),
    toast = useToast();
  const [step, setStep] = useState(0);
  const [docType, setDocType] = useState("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [search, setSearch] = useState<"idle" | "loading" | "new" | "found">(
    "idle",
  );
  const [found, setFound] = useState<{
    customer: Customer;
    linked: boolean;
  } | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [model, setModel] = useState(""),
    [version, setVersion] = useState(""),
    [color, setColor] = useState("");
  const [temperature, setTemperature] = useState<Temperature | "">("");
  const [notes, setNotes] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [error, setError] = useState("");
  const wide = !!user && isManagerOrAdmin(user);
  const cat = useQuery({ queryKey: ["catalog"], queryFn: catalogApi.list });
  const advisors = useAdvisors(wide);
  useUnsavedWarning(!!customer || docNumber.length > 0);

  const m = cat.data?.find((x) => x.name === model);
  const v = m?.versions.find((x) => x.name === version);
  const k = m?.colors.find((x) => x.name === color);
  const advisor = advisors.data?.find((a) => a.id === advisorId);

  const doSearch = async () => {
    setError("");
    setFound(null);
    setCustomer(null);
    if (!docNumber.trim()) {
      setError("Ingrese el número de documento.");
      return;
    }
    setSearch("loading");
    try {
      const r = await customersApi.lookup(docType, docNumber);
      if (r.found) {
        setFound({ customer: r.customer, linked: r.linked });
        setSearch("found");
      } else setSearch("new");
    } catch (e) {
      setError(errorMessage(e));
      setSearch("idle");
    }
  };
  const create = useMutation({
    mutationFn: () =>
      salesApi.create({
        customerId: customer!.id,
        model,
        version,
        color,
        temperature: temperature as Temperature,
        notes,
        advisor: advisor && { id: advisor.id, name: advisor.name },
      }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast("Venta creada con sus 13 tareas.");
      nav(`/ventas/${s.id}`, { replace: true });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const canNext = [
    !!customer,
    !!(model && version && color),
    !!temperature && (!wide || !!advisorId),
    true,
  ][step];
  return (
    <>
      <p className="crumb">
        <Link to="/ventas">← Ventas</Link>
      </p>
      <PageHeader title="Nueva venta" />
      <ol className="steps" aria-label="Pasos">
        {steps.map((s, i) => (
          <li
            key={s}
            className={i === step ? "is-current" : i < step ? "is-done" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <section className="card stack">
        {step === 0 && (
          <>
            <h2>Cliente</h2>
            {customer ? (
              <div className="selected">
                <div>
                  <strong>{customer.displayName}</strong>
                  <div className="muted small">
                    {customerTypeLabel[customer.type]} · {customer.docType}{" "}
                    {customer.docNumber}
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setCustomer(null);
                    setSearch("idle");
                    setFound(null);
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <div className="form-grid">
                  <Field label="Tipo de documento">
                    <select
                      value={docType}
                      onChange={(e) => {
                        setDocType(e.target.value);
                        setSearch("idle");
                      }}
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
                      onChange={(e) => {
                        setDocNumber(e.target.value);
                        setSearch("idle");
                        setFound(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && doSearch()}
                    />
                  </Field>
                </div>
                <div>
                  <button
                    className="btn"
                    onClick={doSearch}
                    disabled={search === "loading"}
                  >
                    Buscar cliente
                  </button>
                </div>
                {search === "loading" && <Spinner label="Buscando…" />}
                {search === "found" && found && (
                  <div className="selected">
                    <div>
                      <strong>{found.customer.displayName}</strong>
                      {!found.linked && (
                        <div className="muted small">
                          Ya existe en el sistema. Solo se muestra el nombre
                          legal.
                        </div>
                      )}
                      {!found.customer.isActive && (
                        <div>
                          <Badge tone="neutral">Inactivo</Badge>{" "}
                          <span className="small">
                            Un cliente inactivo no puede usarse.
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!found.customer.isActive}
                      onClick={() => setCustomer(found.customer)}
                    >
                      Usar este cliente
                    </button>
                  </div>
                )}
                {search === "new" && (
                  <>
                    <Banner tone="info">
                      No hay un cliente con ese documento. Complete sus datos
                      para registrarlo.
                    </Banner>
                    <CustomerForm
                      docType={docType}
                      docNumber={docNumber.trim()}
                      onCreated={(c) => {
                        setCustomer(c);
                        qc.invalidateQueries({ queryKey: ["customers"] });
                        toast("Cliente registrado.");
                      }}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <h2>Vehículo</h2>
            {cat.isLoading ? (
              <Spinner />
            ) : (
              <div className="form-grid">
                <Field label="Modelo">
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setVersion("");
                      setColor("");
                    }}
                  >
                    <option value="">Seleccione…</option>
                    {cat.data
                      ?.filter((x) => !x.archived)
                      .map((x) => (
                        <option key={x.id}>{x.name}</option>
                      ))}
                  </select>
                </Field>
                <Field
                  label="Versión"
                  hint={
                    v ? `Precio de referencia ${money(v.price)}` : undefined
                  }
                >
                  <select
                    value={version}
                    disabled={!m}
                    onChange={(e) => setVersion(e.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {m?.versions
                      .filter((x) => !x.archived)
                      .map((x) => (
                        <option key={x.id}>{x.name}</option>
                      ))}
                  </select>
                </Field>
                <Field label="Color">
                  <select
                    value={color}
                    disabled={!m}
                    onChange={(e) => setColor(e.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {m?.colors
                      .filter((x) => !x.archived)
                      .map((x) => (
                        <option key={x.id}>{x.name}</option>
                      ))}
                  </select>
                </Field>
                {k && (
                  <div className="color-preview">
                    <i
                      className="swatch swatch-lg"
                      style={{ background: k.hex }}
                    />
                    <span>
                      {model} {version}
                      <br />
                      <span className="muted">{k.name}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <h2>Datos de la venta</h2>
            <fieldset className="temp-set">
              <legend>Temperatura del cliente</legend>
              {(Object.keys(temperatureLabel) as Temperature[]).map((t) => (
                <label
                  key={t}
                  className={`temp-opt${temperature === t ? " is-on" : ""}`}
                >
                  <input
                    type="radio"
                    name="temp"
                    checked={temperature === t}
                    onChange={() => setTemperature(t)}
                  />
                  <strong>{temperatureLabel[t]}</strong>
                  <span className="muted small">{temperatureHint[t]}</span>
                </label>
              ))}
              <small className="hint">
                No se puede cambiar después de crear la venta.
              </small>
            </fieldset>
            {wide ? (
              <Field label="Asesor de la venta">
                <select
                  value={advisorId}
                  onChange={(e) => setAdvisorId(e.target.value)}
                >
                  <option value="">Seleccione…</option>
                  {advisors.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <p className="muted">La venta quedará asignada a usted.</p>
            )}
            <Field label="Notas internas (opcional)">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </>
        )}
        {step === 3 && customer && (
          <>
            <h2>Revisión</h2>
            <dl className="dl">
              <dt>Cliente</dt>
              <dd>
                {customer.displayName}
                <div className="muted small">
                  {customerTypeLabel[customer.type]} · {customer.docType}{" "}
                  {customer.docNumber}
                </div>
              </dd>
              <dt>Vehículo</dt>
              <dd>
                {model} {version}
                <div className="muted small">
                  <i className="swatch" style={{ background: k?.hex }} />
                  {color} · referencia {money(v?.price)}
                </div>
              </dd>
              <dt>Temperatura</dt>
              <dd>{temperature && temperatureLabel[temperature]}</dd>
              <dt>Asesor</dt>
              <dd>
                {wide ? advisor?.name : `${user?.firstName} ${user?.lastName}`}
              </dd>
              {notes && (
                <>
                  <dt>Notas</dt>
                  <dd>{notes}</dd>
                </>
              )}
            </dl>
            <Banner tone="info">
              Al guardar se crean las 13 tareas de la venta. Cliente, vehículo y
              temperatura no podrán modificarse; si hay un error, cancele la
              venta y créela de nuevo.
            </Banner>
          </>
        )}
        {error && <Banner tone="danger">{error}</Banner>}
        <div className="form-actions">
          <button
            className="btn"
            onClick={() => (step === 0 ? nav("/ventas") : setStep(step - 1))}
            disabled={create.isPending}
          >
            {step === 0 ? "Cancelar" : "Atrás"}
          </button>
          {step < 3 ? (
            <button
              className="btn btn-primary"
              disabled={!canNext}
              onClick={() => {
                setError("");
                setStep(step + 1);
              }}
            >
              Continuar
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creando…" : "Crear venta"}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
