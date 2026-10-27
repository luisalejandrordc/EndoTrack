import { useState } from "react";
import { formatMoney, initials } from "../../shared/lib/format";
import {
  type Customer,
  type Employee,
  type Role,
  type Sale,
  type VehicleModel,
} from "../../shared/types";
import { Field } from "../../shared/ui/Field";
import { Icon } from "../../shared/ui/Icon";
import { type Toast } from "../../shared/ui/toast";
import { TempPill } from "./components/pills";

export interface NewSaleDraft {
  customerId?: string;
  customerName: string;
  documentType: string;
  documentNumber: string;
  customerType: string;
  email: string;
  phone: string;
  model: VehicleModel;
  version: string;
  color: string;
  temperature: Sale["temperature"];
  notes: string;
  advisor: Employee;
}

export function NewSaleWizard({
  customers,
  vehicles,
  employees,
  role,
  userId,
  initialCustomer,
  onCancel,
  onCreate,
  toast,
}: {
  customers: Customer[];
  vehicles: VehicleModel[];
  employees: Employee[];
  role: Role;
  userId: string;
  initialCustomer?: Customer | null;
  onCancel: () => void;
  onCreate: (draft: NewSaleDraft) => void;
  toast: (toast: Toast) => void;
}) {
  const [step, setStep] = useState(1);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing",
  );
  const [customerId, setCustomerId] = useState(
    initialCustomer?.id || customers[0]?.id || "",
  );
  const [customerName, setCustomerName] = useState("");
  const [documentType, setDocumentType] = useState("RUC");
  const [documentNumber, setDocumentNumber] = useState("");
  const [customerType, setCustomerType] = useState("Embajada");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [modelId, setModelId] = useState(vehicles[0]?.id || "");
  const selectedModel =
    vehicles.find((model) => model.id === modelId) || vehicles[0];
  const [version, setVersion] = useState(
    selectedModel?.versions[1]?.name || selectedModel?.versions[0]?.name || "",
  );
  const [color, setColor] = useState(selectedModel?.colors[0] || "");
  const [temperature, setTemperature] = useState<Sale["temperature"]>("warm");
  const [notes, setNotes] = useState("");
  const [advisorId, setAdvisorId] = useState(
    role === "sales_advisor"
      ? userId
      : employees.find((employee) => employee.role === "sales_advisor")?.id ||
          "",
  );
  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );
  const selectedAdvisor =
    employees.find((employee) => employee.id === advisorId) ||
    employees.find((employee) => employee.role === "sales_advisor") ||
    employees[0];
  const selectedVersion =
    selectedModel?.versions.find((item) => item.name === version) ||
    selectedModel?.versions[0];
  const [customerSearch, setCustomerSearch] = useState("");

  function updateModel(id: string) {
    const next = vehicles.find((vehicle) => vehicle.id === id) || vehicles[0];
    setModelId(id);
    setVersion(next.versions[0]?.name || "");
    setColor(next.colors[0] || "");
  }

  function nextStep() {
    if (step === 1) {
      if (
        customerMode === "existing" &&
        (!selectedCustomer || !selectedCustomer.active)
      )
        return toast({
          title: "Selecciona un cliente activo",
          message:
            "Los clientes inactivos no pueden asociarse a nuevas ventas.",
          tone: "error",
        });
      if (
        customerMode === "new" &&
        (!customerName.trim() || !documentNumber.trim() || !email.trim())
      )
        return toast({
          title: "Completa los datos del cliente",
          message: "Nombre, documento y correo son obligatorios en esta vista.",
          tone: "error",
        });
    }
    if (step === 2 && (!selectedModel || !version || !color))
      return toast({ title: "Selecciona el vehículo", tone: "error" });
    setStep((value) => Math.min(4, value + 1));
  }

  function create() {
    const draft: NewSaleDraft = {
      ...(customerMode === "existing" && selectedCustomer
        ? { customerId: selectedCustomer.id }
        : {}),
      customerName:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.name
          : customerName,
      documentType:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.documentType
          : documentType,
      documentNumber:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.documentNumber
          : documentNumber,
      customerType:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.type
          : customerType,
      email:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.email
          : email,
      phone:
        customerMode === "existing" && selectedCustomer
          ? selectedCustomer.phone
          : phone,
      model: selectedModel,
      version,
      color,
      temperature,
      notes,
      advisor: selectedAdvisor,
    };
    onCreate(draft);
  }

  return (
    <div className="page-stack new-sale-page">
      <div className="detail-back-row">
        <button className="back-link" onClick={onCancel}>
          <Icon name="arrow-left" size={16} /> Volver a ventas
        </button>
        <span className="detail-separator">/</span>
        <span>Registro de operación</span>
      </div>
      <div className="wizard-heading">
        <div>
          <span className="section-kicker">NUEVA OPERACIÓN COMERCIAL</span>
          <h2>Registra una nueva venta</h2>
          <p>
            Completa los datos en cuatro pasos. La operación y sus 13 tareas se
            crearán al confirmar.
          </p>
        </div>
        <span className="wizard-step-counter">
          PASO {step} <span>/</span> 4
        </span>
      </div>
      <div className="wizard-progress">
        <div className="wizard-progress-line">
          <span style={{ width: `${((step - 1) / 3) * 100}%` }} />
        </div>
        {[
          { number: 1, label: "Cliente", desc: "Identificación" },
          { number: 2, label: "Vehículo", desc: "Modelo y versión" },
          { number: 3, label: "Datos de venta", desc: "Asignación" },
          { number: 4, label: "Revisión", desc: "Confirmación" },
        ].map((item) => (
          <div
            key={item.number}
            className={`wizard-step ${step === item.number ? "current" : step > item.number ? "complete" : ""}`}
          >
            <span className="wizard-node">
              {step > item.number ? (
                <Icon name="check" size={16} />
              ) : (
                String(item.number).padStart(2, "0")
              )}
            </span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.desc}</small>
            </div>
          </div>
        ))}
      </div>
      <section className="workspace-card wizard-card">
        {step === 1 && (
          <div className="wizard-panel">
            <div className="wizard-panel-title">
              <span className="wizard-panel-icon">
                <Icon name="users" size={20} />
              </span>
              <div>
                <h3>¿Quién es el cliente?</h3>
                <p>Busca un cliente registrado o crea una ficha nueva.</p>
              </div>
            </div>
            <div className="choice-tabs">
              <button
                className={customerMode === "existing" ? "active" : ""}
                onClick={() => setCustomerMode("existing")}
              >
                Cliente existente
              </button>
              <button
                className={customerMode === "new" ? "active" : ""}
                onClick={() => setCustomerMode("new")}
              >
                <Icon name="plus" size={15} /> Nuevo cliente
              </button>
            </div>
            {customerMode === "existing" ? (
              <div className="customer-picker">
                <Field label="Buscar por nombre o documento">
                  <div className="input-with-icon">
                    <Icon name="search" size={16} />
                    <input
                      value={customerSearch}
                      onChange={(event) =>
                        setCustomerSearch(event.target.value)
                      }
                      placeholder="Nombre, DNI o RUC…"
                    />
                  </div>
                </Field>
                <div className="customer-choice-list">
                  {customers
                    .filter(
                      (customer) =>
                        customer.active &&
                        `${customer.name} ${customer.documentNumber}`
                          .toLowerCase()
                          .includes(customerSearch.toLowerCase()),
                    )
                    .map((customer) => (
                      <button
                        type="button"
                        key={customer.id}
                        className={`customer-choice ${customerId === customer.id ? "selected" : ""}`}
                        onClick={() => setCustomerId(customer.id)}
                      >
                        <span className="customer-choice-avatar">
                          {initials(customer.name)}
                        </span>
                        <span className="customer-choice-copy">
                          <strong>{customer.name}</strong>
                          <small>
                            {customer.documentType} {customer.documentNumber}{" "}
                            <b>·</b> {customer.type}
                          </small>
                        </span>
                        <span className="selection-radio">
                          {customerId === customer.id && <i />}
                        </span>
                      </button>
                    ))}
                </div>
                <p className="form-assist">
                  <Icon name="shield-check" size={15} /> La venta guardará una
                  instantánea de los datos del cliente.
                </p>
              </div>
            ) : (
              <div className="form-grid-two">
                <Field label="Tipo de cliente">
                  <select
                    value={customerType}
                    onChange={(event) => {
                      setCustomerType(event.target.value);
                      setDocumentType(
                        event.target.value === "Diplomático" ? "DNI" : "RUC",
                      );
                    }}
                  >
                    <option>Diplomático</option>
                    <option>Embajada</option>
                    <option>Entidad religiosa católica</option>
                    <option>Entidad religiosa no católica</option>
                    <option>Organismo Internacional</option>
                  </select>
                </Field>
                <Field label="Tipo de documento">
                  <select
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value)}
                  >
                    {(customerType === "Diplomático"
                      ? ["DNI", "CE", "PAS", "CDI"]
                      : ["RUC"]
                    ).map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={
                    customerType === "Diplomático"
                      ? "Nombre completo"
                      : "Razón social"
                  }
                >
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Nombre o razón social"
                    required
                  />
                </Field>
                <Field label="Número de documento">
                  <input
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(event.target.value)}
                    placeholder="Número sin espacios"
                    required
                  />
                </Field>
                <Field label="Correo electrónico">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@empresa.com"
                    required
                  />
                </Field>
                <Field label="Teléfono de contacto">
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+51 999 000 000"
                  />
                </Field>
                <p className="form-assist full-span">
                  <Icon name="info" size={15} /> La consulta automática de
                  identidad se habilitará al conectar el módulo de clientes.
                </p>
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="wizard-panel">
            <div className="wizard-panel-title">
              <span className="wizard-panel-icon">
                <Icon name="car" size={20} />
              </span>
              <div>
                <h3>Selecciona la unidad</h3>
                <p>
                  Elige el modelo, versión y color que se asociarán a esta
                  venta.
                </p>
              </div>
            </div>
            <div className="vehicle-picker-grid">
              {vehicles
                .filter((item) => item.active)
                .map((model) => (
                  <button
                    key={model.id}
                    className={`vehicle-choice-card ${modelId === model.id ? "selected" : ""}`}
                    onClick={() => updateModel(model.id)}
                  >
                    <div className="vehicle-choice-image">
                      <img src={model.image} alt={model.name} />
                      <span>{model.category}</span>
                    </div>
                    <div className="vehicle-choice-info">
                      <strong>{model.name}</strong>
                      <small>{model.description}</small>
                      <div className="vehicle-choice-price">
                        Desde{" "}
                        {formatMoney(
                          Math.min(...model.versions.map((item) => item.price)),
                        )}
                      </div>
                    </div>
                    <span className="selection-radio">
                      {modelId === model.id && <i />}
                    </span>
                  </button>
                ))}
            </div>
            <div className="form-grid-two vehicle-options-row">
              <Field label="Versión">
                <select
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                >
                  {selectedModel?.versions.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name} — {formatMoney(item.price)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Color disponible">
                <select
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                >
                  {selectedModel?.colors.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="selected-vehicle-summary">
              <span className="selected-check">
                <Icon name="check" size={15} />
              </span>
              <div>
                <strong>
                  {selectedModel?.name} · {version}
                </strong>
                <small>{color} · Precio de referencia</small>
              </div>
              <strong>{formatMoney(selectedVersion?.price || 0)}</strong>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="wizard-panel">
            <div className="wizard-panel-title">
              <span className="wizard-panel-icon">
                <Icon name="clipboard" size={20} />
              </span>
              <div>
                <h3>Define los datos de la operación</h3>
                <p>
                  Indica la prioridad comercial, asigna al asesor y agrega notas
                  internas.
                </p>
              </div>
            </div>
            <div className="field">
              <span className="field-label">Temperatura de la venta</span>
              <div className="temperature-choices">
                <button
                  className={temperature === "hot" ? "selected hot" : ""}
                  onClick={() => setTemperature("hot")}
                >
                  <span className="temp-choice-dot hot" />
                  <strong>Alta</strong>
                  <small>Cliente decidido, requiere acción rápida</small>
                  {temperature === "hot" && (
                    <Icon name="check-circle" size={17} />
                  )}
                </button>
                <button
                  className={temperature === "warm" ? "selected warm" : ""}
                  onClick={() => setTemperature("warm")}
                >
                  <span className="temp-choice-dot warm" />
                  <strong>Media</strong>
                  <small>Interés activo, en evaluación</small>
                  {temperature === "warm" && (
                    <Icon name="check-circle" size={17} />
                  )}
                </button>
                <button
                  className={temperature === "cold" ? "selected cold" : ""}
                  onClick={() => setTemperature("cold")}
                >
                  <span className="temp-choice-dot cold" />
                  <strong>Baja</strong>
                  <small>Seguimiento a largo plazo</small>
                  {temperature === "cold" && (
                    <Icon name="check-circle" size={17} />
                  )}
                </button>
              </div>
            </div>
            {role !== "sales_advisor" && (
              <Field label="Asesor responsable">
                <select
                  value={advisorId}
                  onChange={(event) => setAdvisorId(event.target.value)}
                >
                  {employees
                    .filter(
                      (employee) =>
                        employee.role === "sales_advisor" && employee.isActive,
                    )
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field
              label="Notas internas (opcional)"
              hint="Las notas serán visibles para el equipo interno, no para el cliente."
            >
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Acuerdos, fechas estimadas, información relevante…"
              />
            </Field>
            <div className="form-assist">
              <Icon name="info" size={15} />{" "}
              {role === "sales_advisor"
                ? "La venta se asignará automáticamente a tu usuario."
                : "Solo se muestran asesores activos en el selector."}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="wizard-panel review-panel">
            <div className="wizard-panel-title">
              <span className="wizard-panel-icon">
                <Icon name="file-check" size={20} />
              </span>
              <div>
                <h3>Revisa la información</h3>
                <p>
                  Confirma que los datos estén correctos antes de registrar la
                  venta.
                </p>
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-head">
                <h4>Cliente</h4>
                <button className="text-button" onClick={() => setStep(1)}>
                  Editar
                </button>
              </div>
              <div className="review-info-row">
                <div>
                  <span>Nombre o razón social</span>
                  <strong>
                    {customerMode === "existing"
                      ? selectedCustomer?.name
                      : customerName}
                  </strong>
                </div>
                <div>
                  <span>Documento</span>
                  <strong>
                    {customerMode === "existing"
                      ? selectedCustomer?.documentType
                      : documentType}{" "}
                    {customerMode === "existing"
                      ? selectedCustomer?.documentNumber
                      : documentNumber}
                  </strong>
                </div>
              </div>
              <div className="review-info-row">
                <div>
                  <span>Tipo de cliente</span>
                  <strong>
                    {customerMode === "existing"
                      ? selectedCustomer?.type
                      : customerType}
                  </strong>
                </div>
                <div>
                  <span>Contacto</span>
                  <strong>
                    {customerMode === "existing"
                      ? selectedCustomer?.email
                      : email}
                  </strong>
                </div>
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-head">
                <h4>Vehículo seleccionado</h4>
                <button className="text-button" onClick={() => setStep(2)}>
                  Editar
                </button>
              </div>
              <div className="review-vehicle">
                <img src={selectedModel?.image} alt={selectedModel?.name} />
                <div>
                  <strong>{selectedModel?.name}</strong>
                  <span>
                    {version} · {color}
                  </span>
                  <small>Precio de referencia</small>
                </div>
                <strong>{formatMoney(selectedVersion?.price || 0)}</strong>
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-head">
                <h4>Datos de venta</h4>
                <button className="text-button" onClick={() => setStep(3)}>
                  Editar
                </button>
              </div>
              <div className="review-info-row">
                <div>
                  <span>Temperatura</span>
                  <TempPill temperature={temperature} />
                </div>
                <div>
                  <span>Asesor asignado</span>
                  <strong>
                    {selectedAdvisor
                      ? `${selectedAdvisor.firstName} ${selectedAdvisor.lastName}`
                      : "Asignación automática"}
                  </strong>
                </div>
              </div>
              {notes && (
                <div className="review-notes">
                  <span>Notas internas</span>
                  <p>{notes}</p>
                </div>
              )}
            </div>
            <div className="review-disclaimer">
              <Icon name="shield-check" size={18} />
              <span>
                Al registrar, se creará la venta con una instantánea de los
                datos y las 13 tareas definidas para el proceso. En el modo
                demo, el registro se conserva solo en esta sesión.
              </span>
            </div>
          </div>
        )}
        <div className="wizard-footer">
          <button
            className="button button-secondary"
            onClick={
              step === 1 ? onCancel : () => setStep((value) => value - 1)
            }
          >
            {step === 1 ? (
              "Cancelar"
            ) : (
              <>
                <Icon name="arrow-left" size={16} /> Paso anterior
              </>
            )}
          </button>
          <div className="wizard-footer-right">
            <span>Paso {step} de 4</span>
            {step < 4 ? (
              <button className="button button-primary" onClick={nextStep}>
                Continuar <Icon name="arrow-right" size={16} />
              </button>
            ) : (
              <button className="button button-primary" onClick={create}>
                <Icon name="check" size={16} /> Confirmar y crear venta
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
