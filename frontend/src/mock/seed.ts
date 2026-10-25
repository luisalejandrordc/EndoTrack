import { taskDefs } from "../domain/taskDefs";
import type {
  CatalogModel,
  Customer,
  DocFile,
  HistoryEvent,
  Sale,
  TaskInstance,
} from "../domain/types";
import type { Temperature } from "../shared/labels";

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();
const isoDate = (t: number) => iso(t).slice(0, 10);
let hid = 0;
export const newId = () => crypto.randomUUID();
export const event = (
  at: string,
  actor: string,
  kind: HistoryEvent["kind"],
  text: string,
  reason?: string,
): HistoryEvent => ({
  id: `h${++hid}-${Math.random().toString(36).slice(2, 6)}`,
  at,
  actor,
  kind,
  text,
  reason,
});

/** Fictional advisors used when the signed-in user is not an advisor (or to fill the picker). */
export const demoAdvisors = [
  { id: "demo-adv-1", firstName: "Valeria", lastName: "Ibáñez" },
  { id: "demo-adv-2", firstName: "Diego", lastName: "Carrasco" },
];

export const seedCustomers = (): Customer[] => [
  {
    id: "c1",
    type: "embajada",
    docType: "RUC",
    docNumber: "20512345678",
    displayName: "Embajada del Japón",
    legalName: "Embajada del Japón",
    contactFirstName: "Haruto",
    contactLastName: "Tanaka",
    contactJobTitle: "Primer Secretario",
    nationality: "Japonesa",
    phone: "014321000",
    email: "h.tanaka@embajada-jp.demo",
    isActive: true,
    nameSource: "looked_up",
  },
  {
    id: "c2",
    type: "diplomatico",
    docType: "CDI",
    docNumber: "45678901",
    displayName: "Elena Marchetti",
    firstName: "Elena",
    lastName: "Marchetti",
    gender: "F",
    nationality: "Italiana",
    phone: "987654321",
    email: "elena.marchetti@demo.pe",
    isActive: true,
    nameSource: "manual",
  },
  {
    id: "c3",
    type: "entidad_religiosa_catolica",
    docType: "RUC",
    docNumber: "20601122334",
    displayName: "Congregación Hermanas de la Caridad",
    legalName: "Congregación Hermanas de la Caridad",
    contactFirstName: "Sor Marta",
    contactLastName: "Villanueva",
    contactJobTitle: "Ecónoma",
    nationality: "Peruana",
    phone: "014448800",
    email: "economia@caridad.demo",
    isActive: true,
    nameSource: "looked_up",
  },
  {
    id: "c4",
    type: "organismo_internacional",
    docType: "RUC",
    docNumber: "20100998877",
    displayName: "Misión de Cooperación Andina",
    legalName: "Misión de Cooperación Andina",
    contactFirstName: "Pablo",
    contactLastName: "Echeverría",
    contactJobTitle: "Jefe de Administración",
    nationality: "Ecuatoriana",
    phone: "012223344",
    email: "administracion@mca.demo",
    isActive: true,
    nameSource: "manual",
  },
  {
    id: "c5",
    type: "diplomatico",
    docType: "PAS",
    docNumber: "P8841223",
    displayName: "Mateo Larsen",
    firstName: "Mateo",
    lastName: "Larsen",
    gender: "M",
    nationality: "Noruega",
    phone: "955123456",
    email: "m.larsen@demo.pe",
    isActive: true,
    nameSource: "manual",
  },
  {
    id: "c6",
    type: "entidad_religiosa_no_catolica",
    docType: "RUC",
    docNumber: "20556677889",
    displayName: "Iglesia Evangélica Luz del Camino",
    legalName: "Iglesia Evangélica Luz del Camino",
    contactFirstName: "Samuel",
    contactLastName: "Ortega",
    contactJobTitle: "Tesorero",
    nationality: "Peruana",
    phone: "013334455",
    email: "tesoreria@luzdelcamino.demo",
    isActive: false,
    nameSource: "manual",
  },
];

export const seedCatalog = (): CatalogModel[] => [
  {
    id: "m1",
    name: "Hilux",
    categories: ["Pickup"],
    archived: false,
    versions: [
      { id: "v1", name: "SR 4x4 MT", price: "36900.00", archived: false },
      { id: "v2", name: "SRX 4x4 AT", price: "41500.00", archived: false },
    ],
    colors: [
      { id: "k1", name: "Blanco Súper", hex: "#F4F4F2", archived: false },
      { id: "k2", name: "Gris Metálico", hex: "#7A8087", archived: false },
      { id: "k3", name: "Negro Perlado", hex: "#1B1D21", archived: false },
    ],
  },
  {
    id: "m2",
    name: "Land Cruiser Prado",
    categories: ["SUV"],
    archived: false,
    versions: [
      { id: "v3", name: "TX 2.8 Diésel", price: "68900.00", archived: false },
      { id: "v4", name: "VX 2.8 Diésel", price: "76400.00", archived: false },
    ],
    colors: [
      { id: "k4", name: "Blanco Perlado", hex: "#EFEDE6", archived: false },
      { id: "k5", name: "Plata", hex: "#B9BDC2", archived: false },
      { id: "k6", name: "Verde Bosque", hex: "#33463B", archived: false },
    ],
  },
  {
    id: "m3",
    name: "RAV4",
    categories: ["SUV"],
    archived: false,
    versions: [
      { id: "v5", name: "XLE Hybrid", price: "39800.00", archived: false },
    ],
    colors: [
      { id: "k7", name: "Azul Eléctrico", hex: "#2C4F87", archived: false },
      { id: "k8", name: "Blanco Alpino", hex: "#F7F7F5", archived: false },
    ],
  },
  {
    id: "m4",
    name: "Corolla Cross",
    categories: ["SUV", "Crossover"],
    archived: false,
    versions: [
      { id: "v6", name: "Hybrid XLI", price: "29900.00", archived: false },
      { id: "v7", name: "Hybrid SEG", price: "33200.00", archived: false },
    ],
    colors: [
      { id: "k9", name: "Rojo Sensación", hex: "#A32A2F", archived: false },
      { id: "k10", name: "Gris Grafito", hex: "#4A4F55", archived: false },
    ],
  },
  {
    id: "m5",
    name: "Fortuner",
    categories: ["SUV"],
    archived: false,
    versions: [
      { id: "v8", name: "SRV 4x4", price: "47200.00", archived: false },
    ],
    colors: [
      { id: "k11", name: "Bronce Oscuro", hex: "#5B4A3C", archived: false },
    ],
  },
  {
    id: "m6",
    name: "Yaris Cross",
    categories: ["Crossover"],
    archived: true,
    versions: [{ id: "v9", name: "Hybrid", price: "24300.00", archived: true }],
    colors: [
      { id: "k12", name: "Amarillo Solar", hex: "#E3B21F", archived: true },
    ],
  },
];

// ---- realistic sample data so every screen has something to show -------------------------------------
function sampleData(n: number, i: number, t: number): Record<string, string> {
  const d = isoDate(t);
  const s: Record<number, Record<string, string>> = {
    1: {
      initialToyota: "30000.00",
      initialCommission: "1500.00",
      accessories: "800.00",
      releaseProcessing: "400.00",
    },
    2: {
      signerDocType: "CE",
      signerDocNumber: `00${i}456789`,
      signerFirstName: "Akira",
      signerLastName: "Mori",
      pepStatus: "No es PEP",
      ddcRegime: "Simplificado",
    },
    3: {
      series: `SER-${2400 + i}`,
      vin: `JTEBU5JR${i}L5${String(100100 + i * 37).slice(0, 6)}`,
      finalToyota: "29800.00",
    },
    4: {
      bank: "BCP",
      depositDate: d,
      transactionNumber: `0045${i}812`,
      depositedAmount: "32700.00",
    },
    5: {
      bank: "BBVA",
      depositDate: d,
      transactionNumber: `0077${i}340`,
      depositedAmount: "29800.00",
    },
    6: {
      toyotaInvoiceNumber: `F001-${100 + i}`,
      toyotaInvoiceDate: d,
      toyotaInvoiceAmount: "29800.00",
      commissionInvoiceNumber: `E001-${200 + i}`,
      commissionInvoiceDate: d,
      commissionInvoiceAmount: "1700.00",
      accessoriesInvoiceNumber: `E001-${300 + i}`,
      accessoriesInvoiceDate: d,
      accessoriesInvoiceAmount: "800.00",
      releaseInvoiceNumber: `E001-${400 + i}`,
      releaseInvoiceDate: d,
      releaseInvoiceAmount: "400.00",
    },
    7: {},
    8: {
      damNumber: `118-2026-10-${600000 + i}`,
      customsOffice: "Marítima del Callao",
      controlChannel: "Verde",
    },
    9: { personInCharge: "R. Vega (Agencia de aduanas)" },
    10: { plate: `BKT${100 + i}`, registrationDate: d },
    11: { transferDate: d },
    12: { serviceOrderNumber: `OS-${5000 + i}`, equipmentCompletionDate: d },
    13: { deliveryDate: d },
  };
  return s[n] ?? {};
}

export interface SaleSpec {
  i: number;
  customer: Customer;
  vehicle: Sale["vehicle"];
  advisor: Sale["advisor"];
  temperature: Temperature;
  daysAgo: number;
  done: number;
  inProgress?: boolean;
  notes?: string;
  cancel?: { category: string; text: string };
}
export function buildSale(sp: SaleSpec, actorName: string): Sale {
  const created = Date.now() - sp.daysAgo * DAY;
  const code = `V-${String(sp.i).padStart(4, "0")}`;
  const history: HistoryEvent[] = [
    event(iso(created), actorName, "sale", "Venta creada."),
  ];
  const tasks: TaskInstance[] = taskDefs.map((def) => {
    const base: TaskInstance = {
      n: def.n,
      status: "pending",
      startedAt: null,
      completedAt: null,
      dueDate: null,
      data: {},
      docs: {},
      notes: "",
    };
    const startT = created + (def.n - 1) * 2 * DAY + DAY * 0.2,
      endT = Math.min(created + def.n * 2 * DAY, Date.now() - 3600_000);
    const due = def.durationDays ? iso(startT + def.durationDays * DAY) : null;
    if (def.n <= sp.done) {
      const docs: Record<string, DocFile> = {};
      def.docs.forEach((d) => {
        if (
          !d.requiredUnless?.({
            sale: { customer: { type: sp.customer.type } } as Sale,
            n: def.n,
            data: {},
          })
        )
          docs[d.key] = {
            name: `${d.key}-${code}.${d.kind}`,
            size: 180_000 + def.n * 7_331,
            uploadedAt: iso(endT),
          };
      });
      history.push(
        event(
          iso(endT),
          actorName,
          "task",
          `Tarea ${def.n} completada (${def.name}).`,
        ),
      );
      return {
        ...base,
        status: "completed",
        startedAt: iso(startT),
        completedAt: iso(endT),
        dueDate: due,
        data: sampleData(def.n, sp.i, endT),
        docs,
      };
    }
    if (def.n === sp.done + 1 && sp.inProgress) {
      const full = sampleData(def.n, sp.i, Date.now());
      const keys = Object.keys(full).slice(
        0,
        Math.max(1, Math.floor(Object.keys(full).length / 2)),
      );
      history.push(
        event(
          iso(startT),
          actorName,
          "task",
          `Tarea ${def.n} iniciada (${def.name}).`,
        ),
      );
      return {
        ...base,
        status: "in_progress",
        startedAt: iso(startT),
        dueDate: due,
        data: Object.fromEntries(keys.map((k) => [k, full[k]])),
      };
    }
    return base;
  });
  const sale: Sale = {
    id: newId(),
    code,
    customer: {
      id: sp.customer.id,
      name: sp.customer.displayName,
      docType: sp.customer.docType,
      docNumber: sp.customer.docNumber,
      type: sp.customer.type,
    },
    vehicle: sp.vehicle,
    advisor: sp.advisor,
    temperature: sp.temperature,
    state: sp.done === 13 ? "completed" : "active",
    createdAt: iso(created),
    createdBy: actorName,
    notes: sp.notes ?? "",
    tasks,
    history,
  };
  if (sp.cancel) {
    const at = iso(Date.now() - DAY);
    sale.state = "cancelled";
    sale.cancellation = {
      ...sp.cancel,
      atTask: sp.done + 1,
      at,
      by: "Rodrigo Salazar",
    };
    history.push(
      event(
        at,
        "Rodrigo Salazar",
        "sale",
        "Venta cancelada.",
        `${sp.cancel.category}: ${sp.cancel.text}`,
      ),
    );
  }
  if (sale.state === "completed")
    history.push(
      event(
        sale.tasks[12].completedAt!,
        actorName,
        "sale",
        "Venta completada automáticamente al cerrar la tarea 13.",
      ),
    );
  return sale;
}
