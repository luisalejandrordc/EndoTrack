import type { DocumentType, Role } from "./api/types";

// One place for Spanish labels. When GET /reference exists, load these from it instead (see IA §7).
export const roleLabel: Record<Role, string> = { system_admin: "Administrador", sales_manager: "Gerente de ventas", sales_advisor: "Asesor de ventas" };
export const docTypes: DocumentType[] = ["DNI", "CE", "PAS"];
export const docTypeLabel: Record<string, string> = { DNI: "DNI", CE: "Carné de extranjería", PAS: "Pasaporte", CDI: "Doc. de identidad diplomático", RUC: "RUC" };
export const temperatureLabel = { hot: "Caliente", warm: "Tibio", cold: "Frío" } as const;
export const temperatureHint = {
  hot: "El cliente quiere comprar pronto.",
  warm: "Interesado, aún compara opciones.",
  cold: "Primer contacto o interés bajo.",
} as const;
export type Temperature = keyof typeof temperatureLabel;
export const saleStateLabel = { active: "Activa", completed: "Completada", cancelled: "Cancelada" } as const;
export const taskStatusLabel = { pending: "Pendiente", in_progress: "En curso", completed: "Completada" } as const;
export const customerTypeLabel: Record<string, string> = {
  diplomatico: "Diplomático",
  embajada: "Embajada",
  entidad_religiosa_catolica: "Entidad religiosa católica",
  entidad_religiosa_no_catolica: "Entidad religiosa no católica",
  organismo_internacional: "Organismo internacional",
};
export const cancelCategories = [
  { value: "cliente_desistio", label: "Cliente desistió" },
  { value: "pago_no_concretado", label: "Pago o financiamiento no concretado" },
  { value: "unidad_no_disponible", label: "Unidad no disponible" },
  { value: "debida_diligencia", label: "Observación en debida diligencia" },
  { value: "error_registro", label: "Error de registro" },
  { value: "otro", label: "Otro" },
];
export const milestones = [
  { n: 1, name: "Cotización y documentación", tasks: [1, 2] },
  { n: 2, name: "Asignación y pago", tasks: [3, 4] },
  { n: 3, name: "Facturación oficial", tasks: [5, 6] },
  { n: 4, name: "Trámites aduaneros", tasks: [7, 8] },
  { n: 5, name: "Liberación y placas", tasks: [9, 10] },
  { n: 6, name: "Preparación y entrega", tasks: [11, 12, 13] },
];
