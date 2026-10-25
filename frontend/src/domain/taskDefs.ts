import { fromCents, toCents } from "../shared/format";
import type { DocFile, Sale } from "./types";

// The 13 fixed tasks. Names that the specs did not spell out (1, 4, 5, 6, 11, 12, 13) are provisional:
// replace this file with the response of GET /reference once the backend serves it.
export type FieldType = "money" | "date" | "text" | "select" | "textarea";
export interface Ctx {
  sale: Sale;
  n: number;
  data: Record<string, string>;
}
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  optional?: boolean;
  group?: string;
  /** Locked once any later task is completed ("later") or once the given task number is completed. */
  lock?: "later" | number;
  positive?: boolean;
  pattern?: [RegExp, string];
  hint?: string;
  showWhen?: (c: Ctx) => boolean;
  requiredWhen?: (c: Ctx) => boolean;
}
export interface DocDef {
  key: string;
  label: string;
  visible: boolean;
  kind: "pdf" | "xlsx";
  requiredUnless?: (c: Ctx) => boolean;
  group?: string;
}
export interface TaskDef {
  n: number;
  name: string;
  milestone: number;
  durationDays?: number;
  fields: FieldDef[];
  docs: DocDef[];
}

const bank = ["BCP", "BBVA", "Scotiabank", "Interbank"];
const invoiceRe: [RegExp, string] = [
  /^[A-Za-z0-9]{4}-\d{1,8}$/,
  "Formato SERIE-CORRELATIVO: 4 caracteres, guion y de 1 a 8 dígitos (ej. F001-123).",
];
const mismatchField: FieldDef = {
  key: "mismatchReason",
  label: "Motivo de la diferencia",
  type: "textarea",
  showWhen: (c) =>
    mismatches(c.sale, c.n, c.data).length > 0 || !!c.data.mismatchReason,
  requiredWhen: (c) => mismatches(c.sale, c.n, c.data).length > 0,
};
const payment = (n: number): FieldDef[] => [
  { key: "bank", label: "Banco", type: "select", options: bank },
  { key: "depositDate", label: "Fecha del depósito", type: "date" },
  { key: "transactionNumber", label: "Número de operación", type: "text" },
  {
    key: "depositedAmount",
    label: "Monto depositado (USD)",
    type: "money",
    positive: true,
    lock: 6,
  },
  mismatchField,
];
const invoice = (k: string, label: string): FieldDef[] => [
  {
    key: `${k}InvoiceNumber`,
    label: "Número de factura",
    type: "text",
    pattern: invoiceRe,
    group: label,
  },
  {
    key: `${k}InvoiceDate`,
    label: "Fecha de emisión",
    type: "date",
    group: label,
  },
  {
    key: `${k}InvoiceAmount`,
    label: "Monto (USD)",
    type: "money",
    positive: true,
    group: label,
  },
];

export const taskDefs: TaskDef[] = [
  {
    n: 1,
    name: "Cotización",
    milestone: 1,
    fields: [
      {
        key: "initialToyota",
        label: "Monto inicial Toyota (USD)",
        type: "money",
        positive: true,
        lock: "later",
      },
      {
        key: "initialCommission",
        label: "Comisión inicial (USD)",
        type: "money",
        positive: true,
        lock: "later",
      },
      {
        key: "accessories",
        label: "Accesorios (USD)",
        type: "money",
        positive: true,
        lock: "later",
      },
      {
        key: "releaseProcessing",
        label: "Trámite de liberación (USD)",
        type: "money",
        positive: true,
        lock: "later",
      },
    ],
    docs: [
      {
        key: "quotationPdf",
        label: "Cotización (PDF)",
        visible: true,
        kind: "pdf",
      },
      {
        key: "quotationXlsx",
        label: "Cotización (Excel)",
        visible: false,
        kind: "xlsx",
      },
    ],
  },
  {
    n: 2,
    name: "Debida diligencia",
    milestone: 1,
    durationDays: 3,
    fields: [
      {
        key: "signerDocType",
        label: "Tipo de documento del firmante",
        type: "select",
        options: ["DNI", "CE", "PAS", "CDI"],
      },
      { key: "signerDocNumber", label: "Número de documento", type: "text" },
      { key: "signerFirstName", label: "Nombres del firmante", type: "text" },
      { key: "signerLastName", label: "Apellidos del firmante", type: "text" },
      {
        key: "pepStatus",
        label: "Condición PEP",
        type: "select",
        options: ["No es PEP", "Es PEP"],
        hint: "Solo se registra; no bloquea la tarea.",
      },
      {
        key: "ddcRegime",
        label: "Régimen DDC",
        type: "text",
        hint: "Solo se registra; no bloquea la tarea.",
      },
    ],
    docs: [
      {
        key: "identityScan",
        label: "Documento de identidad (escaneo)",
        visible: true,
        kind: "pdf",
      },
      {
        key: "affidavit",
        label: "Declaración de conocimiento del cliente",
        visible: true,
        kind: "pdf",
      },
      {
        key: "powerOfAttorney",
        label: "Vigencia de poder",
        visible: true,
        kind: "pdf",
        requiredUnless: (c) => c.sale.customer.type === "diplomatico",
      },
    ],
  },
  {
    n: 3,
    name: "Liquidación de unidad",
    milestone: 2,
    durationDays: 12,
    fields: [
      { key: "series", label: "Serie", type: "text" },
      {
        key: "vin",
        label: "VIN",
        type: "text",
        pattern: [
          /^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$/,
          "El VIN tiene 17 caracteres (sin I, O ni Q).",
        ],
      },
      {
        key: "finalToyota",
        label: "Monto final Toyota (USD)",
        type: "money",
        positive: true,
        lock: "later",
      },
    ],
    docs: [
      {
        key: "settlement",
        label: "Liquidación de unidad",
        visible: false,
        kind: "pdf",
      },
    ],
  },
  {
    n: 4,
    name: "Depósito del cliente",
    milestone: 2,
    fields: payment(4),
    docs: [
      { key: "voucher", label: "Voucher de pago", visible: true, kind: "pdf" },
    ],
  },
  {
    n: 5,
    name: "Pago a Toyota",
    milestone: 3,
    fields: payment(5),
    docs: [
      { key: "voucher", label: "Voucher de pago", visible: false, kind: "pdf" },
      {
        key: "paymentConfirmation",
        label: "Confirmación de pago",
        visible: false,
        kind: "pdf",
      },
    ],
  },
  {
    n: 6,
    name: "Facturación",
    milestone: 3,
    fields: [
      ...invoice("toyota", "Factura Toyota"),
      ...invoice("commission", "Factura de comisión"),
      ...invoice("accessories", "Factura de accesorios"),
      ...invoice("release", "Factura de trámite de liberación"),
      { ...mismatchField, group: undefined },
    ],
    docs: [
      {
        key: "toyotaInvoice",
        label: "Factura Toyota (PDF)",
        visible: true,
        kind: "pdf",
      },
      {
        key: "commissionInvoice",
        label: "Factura de comisión (PDF)",
        visible: true,
        kind: "pdf",
      },
      {
        key: "accessoriesInvoice",
        label: "Factura de accesorios (PDF)",
        visible: true,
        kind: "pdf",
      },
      {
        key: "releaseInvoice",
        label: "Factura de trámite de liberación (PDF)",
        visible: true,
        kind: "pdf",
      },
    ],
  },
  {
    n: 7,
    name: "Documentos endosados",
    milestone: 4,
    durationDays: 10,
    fields: [],
    docs: [
      {
        key: "endorsed",
        label: "Documentos endosados",
        visible: false,
        kind: "pdf",
      },
    ],
  },
  {
    n: 8,
    name: "Trámite aduanero",
    milestone: 4,
    durationDays: 12,
    fields: [
      { key: "damNumber", label: "Número de DAM", type: "text" },
      {
        key: "customsOffice",
        label: "Aduana",
        type: "select",
        options: ["Marítima del Callao", "Chancay"],
      },
      {
        key: "controlChannel",
        label: "Canal de control",
        type: "select",
        options: ["Verde", "Naranja", "Rojo"],
      },
    ],
    docs: [
      {
        key: "depositOrder",
        label: "Orden de depósito",
        visible: false,
        kind: "pdf",
      },
      {
        key: "customsCertificate",
        label: "Certificado de aduana",
        visible: false,
        kind: "pdf",
      },
    ],
  },
  {
    n: 9,
    name: "Trámite de liberación",
    milestone: 5,
    durationDays: 30,
    fields: [
      { key: "personInCharge", label: "Responsable del trámite", type: "text" },
    ],
    docs: [],
  },
  {
    n: 10,
    name: "Inmatriculación y placas",
    milestone: 5,
    durationDays: 15,
    fields: [
      {
        key: "plate",
        label: "Placa",
        type: "text",
        pattern: [
          /^[A-Za-z0-9]{6,7}$/,
          "La placa tiene 6 o 7 caracteres alfanuméricos.",
        ],
      },
      {
        key: "registrationDate",
        label: "Fecha de inmatriculación",
        type: "date",
      },
    ],
    docs: [{ key: "tive", label: "TIVe", visible: true, kind: "pdf" }],
  },
  {
    n: 11,
    name: "Transferencia de unidad",
    milestone: 6,
    fields: [
      { key: "transferDate", label: "Fecha de transferencia", type: "date" },
    ],
    docs: [],
  },
  {
    n: 12,
    name: "Orden de servicio",
    milestone: 6,
    fields: [
      {
        key: "serviceOrderNumber",
        label: "Número de orden de servicio",
        type: "text",
      },
      {
        key: "equipmentCompletionDate",
        label: "Fecha de término de equipamiento",
        type: "date",
      },
    ],
    docs: [
      {
        key: "serviceOrder",
        label: "Orden de servicio",
        visible: false,
        kind: "pdf",
      },
    ],
  },
  {
    n: 13,
    name: "Entrega al cliente",
    milestone: 6,
    fields: [
      {
        key: "surquilloTransferDate",
        label: "Fecha de traslado a Surquillo",
        type: "date",
        optional: true,
      },
      { key: "deliveryDate", label: "Fecha de entrega", type: "date" },
    ],
    docs: [
      {
        key: "signedDelivery",
        label: "Acta de entrega firmada",
        visible: true,
        kind: "pdf",
      },
    ],
  },
];

// ---- derived values (never stored) -------------------------------------------------------------
const dataOf = (s: Sale, n: number, live?: Ctx) =>
  live && live.n === n ? live.data : s.tasks[n - 1].data;
export function derived(
  sale: Sale,
  live?: { n: number; data: Record<string, string> },
) {
  const l = live ? ({ sale, ...live } as Ctx) : undefined;
  const t1 = dataOf(sale, 1, l),
    t3 = dataOf(sale, 3, l);
  const parts = [
    t1.initialToyota,
    t1.initialCommission,
    t1.accessories,
    t1.releaseProcessing,
  ];
  const quoted = parts.every(Boolean)
    ? parts.reduce((a, v) => a + toCents(v), 0)
    : null;
  const finalToyota = t3.finalToyota ? toCents(t3.finalToyota) : null;
  const finalCommission =
    quoted !== null && finalToyota !== null
      ? quoted -
        finalToyota -
        toCents(t1.accessories) -
        toCents(t1.releaseProcessing)
      : null;
  return { quoted, finalToyota, finalCommission };
}

/** Amount comparisons of tasks 4, 5 and 6: what was expected and what was entered. */
export function comparisons(
  sale: Sale,
  n: number,
  data: Record<string, string>,
) {
  const d = derived(sale),
    t1 = sale.tasks[0].data;
  if (n === 4)
    return [
      {
        key: "depositedAmount",
        label: "Precio final cotizado",
        expected: d.quoted,
        entered: data.depositedAmount,
      },
    ];
  if (n === 5)
    return [
      {
        key: "depositedAmount",
        label: "Monto final Toyota",
        expected: d.finalToyota,
        entered: data.depositedAmount,
      },
    ];
  if (n === 6)
    return [
      {
        key: "toyotaInvoiceAmount",
        label: "Monto final Toyota",
        expected: d.finalToyota,
        entered: data.toyotaInvoiceAmount,
      },
      {
        key: "commissionInvoiceAmount",
        label: "Comisión final",
        expected: d.finalCommission,
        entered: data.commissionInvoiceAmount,
      },
      {
        key: "accessoriesInvoiceAmount",
        label: "Accesorios",
        expected: t1.accessories ? toCents(t1.accessories) : null,
        entered: data.accessoriesInvoiceAmount,
      },
      {
        key: "releaseInvoiceAmount",
        label: "Trámite de liberación",
        expected: t1.releaseProcessing ? toCents(t1.releaseProcessing) : null,
        entered: data.releaseInvoiceAmount,
      },
    ];
  return [];
}
export const mismatches = (
  sale: Sale,
  n: number,
  data: Record<string, string>,
) =>
  comparisons(sale, n, data).filter(
    (c) =>
      c.entered && c.expected !== null && toCents(c.entered) !== c.expected,
  );

export const isLocked = (sale: Sale, n: number, f: FieldDef) => {
  if (!f.lock || sale.tasks[n - 1].status !== "completed") return false;
  return f.lock === "later"
    ? sale.tasks.some((t) => t.n > n && t.status === "completed")
    : sale.tasks[f.lock - 1].status === "completed";
};

// ---- validation on completion -------------------------------------------------------------------
const validDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;

export function validateTask(
  sale: Sale,
  n: number,
  data: Record<string, string>,
  docs: Record<string, DocFile>,
  all: Sale[],
) {
  const def = taskDefs[n - 1];
  const ctx: Ctx = { sale, n, data };
  const errors: string[] = [],
    warnings: string[] = [];
  for (const f of def.fields) {
    if (f.showWhen && !f.showWhen(ctx)) continue;
    const v = (data[f.key] ?? "").trim();
    const required = f.optional
      ? false
      : f.requiredWhen
        ? f.requiredWhen(ctx)
        : true;
    if (!v) {
      if (required)
        errors.push(
          `${f.group ? f.group + " – " : ""}${f.label}: es obligatorio.`,
        );
      continue;
    }
    if (
      f.type === "money" &&
      (!/^\d+(\.\d{1,2})?$/.test(v) || (f.positive && toCents(v) <= 0))
    )
      errors.push(
        `${f.label}: ingrese un monto mayor que cero con hasta 2 decimales.`,
      );
    if (f.type === "date") {
      if (!validDate(v)) errors.push(`${f.label}: la fecha no es válida.`);
      else if (v < sale.createdAt.slice(0, 10))
        warnings.push(`${f.label} es anterior a la creación de la venta.`);
    }
    if (f.pattern && !f.pattern[0].test(v))
      errors.push(`${f.label}: ${f.pattern[1]}`);
  }
  for (const d of def.docs) {
    if (d.requiredUnless?.(ctx)) continue;
    if (!docs[d.key]) errors.push(`Documento «${d.label}»: falta subirlo.`);
  }
  if (n === 3) {
    const { finalCommission } = derived(sale, { n, data });
    if (finalCommission !== null && finalCommission <= 0)
      errors.push(
        "La comisión final calculada debe ser mayor que cero. Revise el monto final Toyota.",
      );
  }
  // uniqueness (mock of the database partial indexes)
  const others = all.filter((s) => s.id !== sale.id);
  const live = (s: Sale) => s.state !== "cancelled";
  const clash = (
    label: string,
    v: string | undefined,
    pick: (s: Sale) => string | undefined,
    onlyLive: boolean,
  ) => {
    if (
      v &&
      others.some(
        (s) =>
          (!onlyLive || live(s)) && pick(s)?.toLowerCase() === v.toLowerCase(),
      )
    )
      errors.push(`${label} «${v}» ya está registrado en otra venta.`);
  };
  if (n === 3) {
    clash("La serie", data.series, (s) => s.tasks[2].data.series, true);
    clash("El VIN", data.vin, (s) => s.tasks[2].data.vin, true);
  }
  if (n === 10)
    clash("La placa", data.plate, (s) => s.tasks[9].data.plate, true);
  if (n === 8)
    clash(
      "El número de DAM",
      data.damNumber,
      (s) => s.tasks[7].data.damNumber,
      false,
    );
  if ((n === 4 || n === 5) && data.bank && data.transactionNumber)
    if (
      others.some(
        (s) =>
          s.tasks[n - 1].data.bank === data.bank &&
          s.tasks[n - 1].data.transactionNumber === data.transactionNumber,
      )
    )
      errors.push(
        `La operación ${data.transactionNumber} de ${data.bank} ya fue usada en otra venta.`,
      );
  if (n === 6) {
    const mine = (k: string) => data[`${k}InvoiceNumber`]?.toLowerCase();
    others.forEach((s) => {
      const d = s.tasks[5].data;
      ["toyota", "commission", "accessories", "release"].forEach((k) => {
        const num = mine(k);
        if (!num) return;
        const pool =
          k === "toyota"
            ? ["toyota"]
            : ["commission", "accessories", "release"];
        if (pool.some((p) => d[`${p}InvoiceNumber`]?.toLowerCase() === num))
          errors.push(
            `La factura ${data[`${k}InvoiceNumber`]} ya existe en otra venta.`,
          );
      });
    });
    const own = ["commission", "accessories", "release"]
      .map(mine)
      .filter(Boolean);
    if (new Set(own).size !== own.length)
      errors.push(
        "Las facturas de comisión, accesorios y liberación no pueden repetir número.",
      );
  }
  return { errors: [...new Set(errors)], warnings };
}
export const sumCents = (a: string[]) =>
  fromCents(a.reduce((x, v) => x + toCents(v), 0));
