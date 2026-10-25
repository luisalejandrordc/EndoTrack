// In-memory stand-in for the sales, customers and catalog modules (backend phases 1E and 1G).
// It follows the State Machines & Permissions Spec so the screens can be built and demoed now.
// Replace each function with a call to the real endpoint when it ships; screens do not change.
import { ApiError } from "../shared/api/client";
import type { Profile } from "../shared/api/types";
import {
  cancelRule,
  canAct,
  canDeleteSale,
  canReassign,
  currentTaskNumber,
  isEligible,
  isLatestCompleted,
  isManagerOrAdmin,
  reopenSaleRule,
} from "../domain/permissions";
import { isLocked, taskDefs, validateTask } from "../domain/taskDefs";
import type { CatalogModel, Customer, DocFile, Sale } from "../domain/types";
import type { Temperature } from "../shared/labels";
import {
  buildSale,
  demoAdvisors,
  event,
  newId,
  seedCatalog,
  seedCustomers,
} from "./seed";

const DAY = 86_400_000;
let actor: Profile | null = null;
let customers: Customer[] = [];
let catalog: CatalogModel[] = [];
let sales: Sale[] = [];
let seededFor = "";

const wait = (ms = 140) => new Promise((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => structuredClone(v);
function fail(
  status: number,
  code: string,
  message: string,
  fields: { field: string; code: string; message: string }[] = [],
): never {
  throw new ApiError(status, code, message, fields);
}
const me = () =>
  actor ??
  fail(401, "SESSION_INVALID", "Su sesión terminó. Inicie sesión nuevamente.");
const name = (u: Profile) => `${u.firstName} ${u.lastName}`;
const now = () => new Date().toISOString();
const nameOf = (a: { firstName: string; lastName: string }) =>
  `${a.firstName} ${a.lastName}`;

/** Called by the app shell whenever the signed-in employee changes; reseeds so "own sales" make sense. */
export function setMockActor(u: Profile | null) {
  actor = u;
  if (!u || seededFor === u.id) return;
  seededFor = u.id;
  customers = seedCustomers();
  catalog = seedCatalog();
  const pick = (id: string) => customers.find((c) => c.id === id)!;
  const veh = (
    m: string,
    v: string,
    c: string,
    hex: string,
    price: string,
  ) => ({ model: m, version: v, color: c, colorHex: hex, price });
  const mine =
    u.role === "sales_advisor"
      ? { id: u.id, name: name(u) }
      : { id: demoAdvisors[0].id, name: nameOf(demoAdvisors[0]) };
  const other = { id: demoAdvisors[1].id, name: nameOf(demoAdvisors[1]) };
  const third =
    u.role === "sales_advisor"
      ? { id: demoAdvisors[0].id, name: nameOf(demoAdvisors[0]) }
      : mine;
  sales = [
    buildSale(
      {
        i: 6,
        customer: pick("c5"),
        vehicle: veh(
          "Hilux",
          "SRX 4x4 AT",
          "Gris Metálico",
          "#7A8087",
          "41500.00",
        ),
        advisor: mine,
        temperature: "hot",
        daysAgo: 24,
        done: 9,
        inProgress: true,
        notes: "Cliente pidió entrega antes de fin de mes.",
      },
      mine.name,
    ),
    buildSale(
      {
        i: 5,
        customer: pick("c1"),
        vehicle: veh(
          "Land Cruiser Prado",
          "VX 2.8 Diésel",
          "Blanco Perlado",
          "#EFEDE6",
          "76400.00",
        ),
        advisor: mine,
        temperature: "hot",
        daysAgo: 18,
        done: 6,
        inProgress: true,
      },
      mine.name,
    ),
    buildSale(
      {
        i: 4,
        customer: pick("c2"),
        vehicle: veh(
          "Hilux",
          "SR 4x4 MT",
          "Negro Perlado",
          "#1B1D21",
          "36900.00",
        ),
        advisor: mine,
        temperature: "warm",
        daysAgo: 7,
        done: 2,
        inProgress: true,
      },
      mine.name,
    ),
    buildSale(
      {
        i: 3,
        customer: pick("c3"),
        vehicle: veh(
          "RAV4",
          "XLE Hybrid",
          "Azul Eléctrico",
          "#2C4F87",
          "39800.00",
        ),
        advisor: third,
        temperature: "warm",
        daysAgo: 1,
        done: 0,
      },
      third.name,
    ),
    buildSale(
      {
        i: 2,
        customer: pick("c4"),
        vehicle: veh(
          "Corolla Cross",
          "Hybrid SEG",
          "Rojo Sensación",
          "#A32A2F",
          "33200.00",
        ),
        advisor: other,
        temperature: "cold",
        daysAgo: 40,
        done: 13,
      },
      other.name,
    ),
    buildSale(
      {
        i: 1,
        customer: pick("c6"),
        vehicle: veh(
          "Fortuner",
          "SRV 4x4",
          "Bronce Oscuro",
          "#5B4A3C",
          "47200.00",
        ),
        advisor: other,
        temperature: "cold",
        daysAgo: 12,
        done: 1,
        cancel: {
          category: "cliente_desistio",
          text: "El cliente optó por otra marca.",
        },
      },
      other.name,
    ),
  ].map((s, idx, arr) => ({
    ...s,
    code: `V-${String(arr.length - idx).padStart(4, "0")}`,
  }));
  customers.find((c) => c.id === "c1")!.createdByAdvisorId = mine.id;
}

const visible = (s: Sale) => canAct(me(), s);
const findSale = (id: string) => {
  const s = sales.find((x) => x.id === id);
  return s && visible(s)
    ? s
    : fail(404, "SALE_NOT_FOUND", "Venta no encontrada.");
};
const log = (
  s: Sale,
  kind: Parameters<typeof event>[2],
  text: string,
  reason?: string,
) => s.history.unshift(event(now(), name(me()), kind, text, reason));

// ================================ sales ================================
export interface SaleQuery {
  q?: string;
  state?: string;
  task?: string;
  advisor?: string;
  type?: string;
  temperature?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}
export const salesApi = {
  async list(p: SaleQuery) {
    await wait();
    const term = (p.q ?? "").toLowerCase();
    let list = sales.filter(visible).filter((s) => {
      const d = (n: number, k: string) => s.tasks[n - 1].data[k] ?? "";
      const hay = [
        s.code,
        s.customer.name,
        s.customer.docNumber,
        s.vehicle.model,
        s.vehicle.version,
        d(3, "series"),
        d(3, "vin"),
        d(10, "plate"),
      ]
        .join(" ")
        .toLowerCase();
      const cur = currentTaskNumber(s);
      return (
        (!term || hay.includes(term)) &&
        (!p.state || s.state === p.state) &&
        (!p.advisor || s.advisor.id === p.advisor) &&
        (!p.type || s.customer.type === p.type) &&
        (!p.temperature || s.temperature === p.temperature) &&
        (!p.task || String(cur) === p.task)
      );
    });
    const dir = p.sort?.startsWith("-") ? -1 : 1,
      key = (p.sort ?? "-createdAt").replace("-", "");
    list = [...list].sort(
      (a, b) =>
        (key === "customer"
          ? a.customer.name.localeCompare(b.customer.name)
          : a.createdAt.localeCompare(b.createdAt)) * dir,
    );
    const page = p.page ?? 1,
      pageSize = p.pageSize ?? 20;
    return {
      items: clone(list.slice((page - 1) * pageSize, page * pageSize)),
      page,
      pageSize,
      total: list.length,
    };
  },
  async get(id: string) {
    await wait();
    return clone(findSale(id));
  },

  async create(i: {
    customerId: string;
    model: string;
    version: string;
    color: string;
    temperature: Temperature;
    notes: string;
    advisor?: { id: string; name: string };
  }) {
    await wait(300);
    const u = me();
    const c = customers.find((x) => x.id === i.customerId);
    if (!c || !c.isActive)
      fail(
        422,
        "CUSTOMER_INACTIVE",
        "El cliente no está activo y no puede usarse en una venta nueva.",
      );
    const m = catalog.find((x) => x.name === i.model)!,
      v = m.versions.find((x) => x.name === i.version)!,
      k = m.colors.find((x) => x.name === i.color)!;
    const advisor =
      u.role === "sales_advisor"
        ? { id: u.id, name: name(u) }
        : (i.advisor ??
          fail(422, "VALIDATION_FAILED", "Seleccione el asesor de la venta.", [
            {
              field: "advisor",
              code: "REQUIRED",
              message: "Seleccione un asesor.",
            },
          ]));
    const s = buildSale(
      {
        i: sales.length + 1,
        customer: c,
        vehicle: {
          model: m.name,
          version: v.name,
          color: k.name,
          colorHex: k.hex,
          price: v.price,
        },
        advisor,
        temperature: i.temperature,
        daysAgo: 0,
        done: 0,
        notes: i.notes,
      },
      name(u),
    );
    s.history = [
      event(
        s.createdAt,
        name(u),
        "sale",
        `Venta creada con ${s.tasks.length} tareas.`,
      ),
    ];
    sales.unshift(s);
    if (c.createdByAdvisorId === u.id) delete c.createdByAdvisorId;
    return clone(s);
  },
  async saveNotes(id: string, notes: string) {
    await wait();
    const s = findSale(id);
    if (!canAct(me(), s))
      fail(403, "FORBIDDEN", "Su rol no permite esta acción.");
    s.notes = notes;
    log(s, "sale", "Notas de la venta actualizadas.");
    return clone(s);
  },

  async cancel(id: string, v: { category: string; reason: string }) {
    await wait();
    const s = findSale(id),
      u = me();
    const r = cancelRule(u, s);
    if (!r.allowed)
      fail(403, "FORBIDDEN", r.why ?? "No puede cancelar esta venta.");
    s.state = "cancelled";
    s.cancellation = {
      category: v.category,
      text: v.reason,
      atTask: currentTaskNumber(s) ?? 13,
      at: now(),
      by: name(u),
    };
    log(
      s,
      "sale",
      "Venta cancelada.",
      `${v.category}${v.reason ? ": " + v.reason : ""}`,
    );
    return clone(s);
  },
  async reopenSale(id: string, reason: string) {
    await wait();
    const s = findSale(id),
      u = me();
    const r = reopenSaleRule(u, s);
    if (!r.allowed)
      fail(403, "FORBIDDEN", r.why ?? "No puede reabrir esta venta.");
    const live = sales.filter((x) => x.id !== s.id && x.state !== "cancelled");
    const ids: [string, string | undefined, (x: Sale) => string | undefined][] =
      [
        ["serie", s.tasks[2].data.series, (x) => x.tasks[2].data.series],
        ["VIN", s.tasks[2].data.vin, (x) => x.tasks[2].data.vin],
        ["placa", s.tasks[9].data.plate, (x) => x.tasks[9].data.plate],
      ];
    for (const [label, val, pick] of ids)
      if (val && live.some((x) => pick(x)?.toLowerCase() === val.toLowerCase()))
        fail(
          409,
          "SALE_IDENTIFIER_CONFLICT",
          `No se puede reabrir: la ${label} «${val}» ya está en otra venta activa o completada.`,
        );
    s.state = "active";
    delete s.cancellation;
    log(s, "sale", "Venta reabierta.", reason);
    return clone(s);
  },
  async reassign(id: string, a: { id: string; name: string }, note: string) {
    await wait();
    const s = findSale(id);
    if (!canReassign(me(), s))
      fail(
        403,
        "FORBIDDEN",
        "Solo se pueden reasignar ventas activas, y solo un Gerente o Administrador.",
      );
    const prev = s.advisor.name;
    s.advisor = a;
    log(
      s,
      "advisor",
      `Asesor reasignado de ${prev} a ${a.name}.`,
      note || undefined,
    );
    return clone(s);
  },
  async remove(id: string, reason: string) {
    await wait();
    const s = findSale(id);
    if (!canDeleteSale(me(), s))
      fail(
        403,
        "FORBIDDEN",
        "Solo un Administrador puede eliminar ventas que nunca llegaron a la entrega.",
      );
    if (!reason)
      fail(422, "REASON_REQUIRED", "Indique el motivo de la eliminación.");
    sales = sales.filter((x) => x.id !== id);
  },

  // ---- tasks ----
  async start(id: string, n: number) {
    await wait();
    const s = findSale(id),
      t = s.tasks[n - 1];
    if (!canAct(me(), s))
      fail(403, "FORBIDDEN", "Su rol no permite esta acción.");
    if (s.state !== "active")
      fail(409, "SALE_NOT_ACTIVE", "La venta no está activa.");
    if (t.status !== "pending" || !isEligible(s, t))
      fail(
        409,
        "TASK_NOT_ELIGIBLE",
        t.status !== "pending"
          ? "La tarea ya cambió de estado; recargue para ver los cambios."
          : `Primero debe completarse la tarea ${n - 1}.`,
      );
    t.status = "in_progress";
    t.startedAt = now();
    const d = taskDefs[n - 1].durationDays;
    t.dueDate = d ? new Date(Date.now() + d * DAY).toISOString() : null;
    log(s, "task", `Tarea ${n} iniciada (${taskDefs[n - 1].name}).`);
    return clone(s);
  },
  async saveData(id: string, n: number, data: Record<string, string>) {
    await wait(100);
    const s = findSale(id),
      t = s.tasks[n - 1];
    if (!canAct(me(), s) || t.status !== "in_progress")
      fail(
        409,
        "TASK_NOT_EDITABLE",
        "La tarea no está en curso; recargue para ver los cambios.",
      );
    t.data = { ...t.data, ...data };
    return clone(s);
  },
  async complete(id: string, n: number, data: Record<string, string>) {
    await wait(260);
    const s = findSale(id),
      t = s.tasks[n - 1];
    if (!canAct(me(), s))
      fail(403, "FORBIDDEN", "Su rol no permite esta acción.");
    if (t.status !== "in_progress")
      fail(
        409,
        "TASK_NOT_IN_PROGRESS",
        "La tarea ya cambió de estado; recargue para ver los cambios.",
      );
    const merged = { ...t.data, ...data };
    const { errors } = validateTask(s, n, merged, t.docs, sales);
    if (errors.length)
      fail(
        422,
        "TASK_INCOMPLETE",
        `No se puede completar la tarea ${n}: ${errors.length === 1 ? "hay 1 problema" : `hay ${errors.length} problemas`}.`,
        errors.map((m) => ({ field: "", code: "INVALID", message: m })),
      );
    t.data = merged;
    t.status = "completed";
    t.completedAt = now();
    log(s, "task", `Tarea ${n} completada (${taskDefs[n - 1].name}).`);
    if (n === 13) {
      s.state = "completed";
      log(s, "sale", "Venta completada automáticamente al cerrar la tarea 13.");
    }
    return clone(s);
  },
  async restart(id: string, n: number, reason: string) {
    await wait();
    const s = findSale(id),
      t = s.tasks[n - 1];
    if (!isManagerOrAdmin(me()))
      fail(
        403,
        "FORBIDDEN",
        "Solo un Gerente o Administrador puede reiniciar tareas.",
      );
    if (t.status !== "in_progress")
      fail(
        409,
        "TASK_NOT_IN_PROGRESS",
        "La tarea ya cambió de estado; recargue para ver los cambios.",
      );
    t.status = "pending";
    t.startedAt = null;
    t.dueDate = null;
    log(s, "task", `Tarea ${n} reiniciada. Los datos se conservaron.`, reason);
    return clone(s);
  },
  async reopenTask(id: string, n: number, reason: string) {
    await wait();
    const s = findSale(id),
      t = s.tasks[n - 1];
    if (!isManagerOrAdmin(me()))
      fail(
        403,
        "FORBIDDEN",
        "Solo un Gerente o Administrador puede reabrir tareas.",
      );
    if (s.state === "cancelled")
      fail(409, "SALE_NOT_ACTIVE", "La venta está cancelada.");
    if (s.state === "completed" && n !== 13)
      fail(
        409,
        "TASK_NOT_LATEST",
        "En una venta completada solo se puede reabrir la tarea 13.",
      );
    if (
      !isLatestCompleted(s, t) ||
      s.tasks.some((x) => x.status === "in_progress")
    )
      fail(
        409,
        "TASK_NOT_LATEST",
        `Reabra primero la tarea ${n + 1} (o reinicie la que está en curso).`,
      );
    t.status = "in_progress";
    t.completedAt = null;
    if (s.state === "completed") s.state = "active";
    log(s, "task", `Tarea ${n} reabierta.`, reason);
    return clone(s);
  },
  async editCompleted(
    id: string,
    n: number,
    data: Record<string, string>,
    reason: string,
  ) {
    await wait();
    const s = findSale(id),
      t = s.tasks[n - 1];
    if (!isManagerOrAdmin(me()))
      fail(
        403,
        "FORBIDDEN",
        "Solo un Gerente o Administrador puede editar tareas completadas.",
      );
    if (t.status !== "completed")
      fail(
        409,
        "TASK_NOT_COMPLETED",
        "La tarea ya cambió de estado; recargue para ver los cambios.",
      );
    const changed = Object.keys(data).filter(
      (k) => (data[k] ?? "") !== (t.data[k] ?? ""),
    );
    for (const k of changed) {
      const f = taskDefs[n - 1].fields.find((x) => x.key === k);
      if (f && isLocked(s, n, f))
        fail(
          422,
          "TASK_FINANCIAL_FIELD_LOCKED",
          "Bloqueado: hay tareas posteriores completadas. Reabra primero las tareas posteriores en orden inverso.",
          [{ field: k, code: "LOCKED", message: f.label }],
        );
    }
    const merged = { ...t.data, ...data };
    const { errors } = validateTask(s, n, merged, t.docs, sales);
    if (errors.length)
      fail(
        422,
        "TASK_INCOMPLETE",
        "Los cambios no son válidos.",
        errors.map((m) => ({ field: "", code: "INVALID", message: m })),
      );
    t.data = merged;
    log(
      s,
      "task",
      `Tarea ${n} editada (${changed.length} campo${changed.length === 1 ? "" : "s"}).`,
      reason,
    );
    return clone(s);
  },
  async saveTaskNotes(id: string, n: number, notes: string) {
    await wait(100);
    const s = findSale(id);
    if (!canAct(me(), s))
      fail(403, "FORBIDDEN", "Su rol no permite esta acción.");
    s.tasks[n - 1].notes = notes;
    return clone(s);
  },

  // ---- documents (metadata only: the file itself waits for backend phase 1F) ----
  async upload(
    id: string,
    n: number,
    slot: string,
    file: { name: string; size: number },
    reason?: string,
  ) {
    await wait(300);
    const s = findSale(id),
      t = s.tasks[n - 1],
      u = me();
    const inProgressActor = t.status === "in_progress" && canAct(u, s);
    if (
      !inProgressActor &&
      !(isManagerOrAdmin(u) && t.status === "completed" && reason)
    )
      fail(
        403,
        "FORBIDDEN",
        "Solo se pueden subir documentos mientras la tarea está en curso (o con motivo, un Gerente o Administrador).",
      );
    const replaced = !!t.docs[slot];
    t.docs[slot] = { ...file, uploadedAt: now() } as DocFile;
    log(
      s,
      "document",
      `Documento «${slot}» ${replaced ? "reemplazado" : "subido"} en la tarea ${n}.`,
      reason,
    );
    return clone(s);
  },
  async removeDoc(id: string, n: number, slot: string) {
    await wait();
    const s = findSale(id),
      t = s.tasks[n - 1];
    if (t.status !== "in_progress" || !canAct(me(), s))
      fail(
        409,
        "TASK_NOT_EDITABLE",
        "Solo se pueden quitar documentos mientras la tarea está en curso.",
      );
    delete t.docs[slot];
    log(s, "document", `Documento «${slot}» quitado de la tarea ${n}.`);
    return clone(s);
  },
};

// ================================ customers ================================
const inScope = (c: Customer) =>
  isManagerOrAdmin(me()) ||
  sales.some((s) => s.customer.id === c.id && s.advisor.id === me().id) ||
  (c.createdByAdvisorId === me().id &&
    !sales.some((s) => s.customer.id === c.id));
export interface CustomerInput {
  type: string;
  docType: string;
  docNumber: string;
  firstName?: string;
  lastName?: string;
  gender?: "M" | "F";
  legalName?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactJobTitle?: string;
  nationality: string;
  phone: string;
  email: string;
  nameSource: "manual" | "looked_up";
}
export const customersApi = {
  async list(p: {
    q?: string;
    type?: string;
    active?: string;
    page?: number;
    pageSize?: number;
  }) {
    await wait();
    const term = (p.q ?? "").toLowerCase();
    const list = customers
      .filter(inScope)
      .filter(
        (c) =>
          (!term ||
            `${c.displayName} ${c.docNumber}`.toLowerCase().includes(term)) &&
          (!p.type || c.type === p.type) &&
          (!p.active || String(c.isActive) === p.active),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    const page = p.page ?? 1,
      pageSize = p.pageSize ?? 20;
    return {
      items: clone(list.slice((page - 1) * pageSize, page * pageSize)).map(
        (c) => ({
          ...c,
          saleCount: sales.filter((s) => s.customer.id === c.id).length,
        }),
      ),
      page,
      pageSize,
      total: list.length,
    };
  },
  /** Existence lookup. An advisor not linked to the customer learns only the legal name. */
  async lookup(docType: string, docNumber: string) {
    await wait();
    const c = customers.find(
      (x) => x.docType === docType && x.docNumber === docNumber.trim(),
    );
    if (!c) return { found: false as const };
    return inScope(c)
      ? { found: true as const, linked: true, customer: clone(c) }
      : {
          found: true as const,
          linked: false,
          customer: {
            ...clone(c),
            phone: "",
            email: "",
            contactFirstName: "",
            contactLastName: "",
          } as Customer,
        };
  },
  async create(i: CustomerInput) {
    await wait(300);
    if (
      customers.some(
        (c) => c.docType === i.docType && c.docNumber === i.docNumber,
      )
    )
      fail(
        409,
        "CUSTOMER_ALREADY_EXISTS",
        "Ya existe un cliente con ese documento.",
      );
    const c: Customer = {
      ...i,
      id: newId(),
      isActive: true,
      displayName: i.legalName ?? `${i.firstName} ${i.lastName}`,
      createdByAdvisorId: me().role === "sales_advisor" ? me().id : undefined,
    };
    customers.push(c);
    return clone(c);
  },
  async setActive(id: string, active: boolean) {
    await wait();
    if (!isManagerOrAdmin(me()))
      fail(403, "FORBIDDEN", "Su rol no permite esta acción.");
    const c = customers.find((x) => x.id === id)!;
    c.isActive = active;
    return clone(c);
  },
  /** Mock of the Codart lookup: numbers ending in 0 fail, to show the manual fallback. */
  async codart(docType: string, docNumber: string) {
    await wait(700);
    if (docNumber.endsWith("0"))
      fail(
        503,
        "LOOKUP_UNAVAILABLE",
        "La consulta no respondió o se agotó la cuota mensual. Ingrese los datos manualmente.",
      );
    const n = Number(docNumber.slice(-1));
    return docType === "RUC"
      ? {
          legalName: `Representaciones ${["Andinas", "del Pacífico", "Lima Sur", "San Isidro", "Sudamericana"][n % 5]} S.A.C.`,
        }
      : {
          firstName: [
            "Rosa Elena",
            "Luis Alberto",
            "Karen",
            "Julio César",
            "Marisol",
          ][n % 5],
          lastName: [
            "Quispe Huamán",
            "Ramírez Soto",
            "Lozano Vega",
            "Cárdenas Ruiz",
            "Paredes Gil",
          ][n % 5],
        };
  },
};

// ================================ catalog ================================
export const catalogApi = {
  async list() {
    await wait();
    return clone(catalog);
  },
  async setArchived(id: string, archived: boolean) {
    await wait();
    if (!isManagerOrAdmin(me()))
      fail(403, "FORBIDDEN", "Su rol no permite esta acción.");
    const m = catalog.find((x) => x.id === id)!;
    m.archived = archived;
    return clone(m);
  },
  async create(i: {
    name: string;
    category: string;
    versionName: string;
    price: string;
    colorName: string;
    colorHex: string;
  }) {
    await wait(300);
    if (!isManagerOrAdmin(me()))
      fail(403, "FORBIDDEN", "Su rol no permite esta acción.");
    if (catalog.some((m) => m.name.toLowerCase() === i.name.toLowerCase()))
      fail(409, "MODEL_ALREADY_EXISTS", "Ya existe un modelo con ese nombre.");
    const m: CatalogModel = {
      id: newId(),
      name: i.name,
      categories: [i.category],
      archived: false,
      versions: [
        { id: newId(), name: i.versionName, price: i.price, archived: false },
      ],
      colors: [
        { id: newId(), name: i.colorName, hex: i.colorHex, archived: false },
      ],
    };
    catalog.push(m);
    return clone(m);
  },
};
