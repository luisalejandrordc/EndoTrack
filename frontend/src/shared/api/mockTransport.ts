// Offline demo backend for auth + staff, used only when VITE_MOCK_ALL=true.
// Demo accounts (document type DNI, password "demo-password-1"): 10000001 admin, 10000002 manager, 10000003 advisor.
import type { RawResponse } from "./client";
import type { Employee, Role } from "./types";

export const DEMO_PASSWORD = "demo-password-1";
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const mk = (
  n: number,
  first: string,
  last: string,
  role: Role,
  extra: Partial<Employee> = {},
): Employee => ({
  id: uid(),
  documentType: "DNI",
  documentNumber: String(10000000 + n),
  firstName: first,
  lastName: last,
  nameSource: "manual",
  nationality: "Peruana",
  gender: "F",
  birthdate: "1990-04-12",
  hireDate: "2024-03-01",
  businessPhone: "999111" + String(200 + n),
  businessEmail: `${first.toLowerCase()}@grupopana.demo`,
  role,
  isActive: true,
  activatedAt: now(),
  version: 1,
  createdAt: now(),
  updatedAt: now(),
  ...extra,
});
const employees: Employee[] = [
  mk(1, "Maju", "Administradora", "system_admin"),
  mk(2, "Rodrigo", "Salazar", "sales_manager", { gender: "M" }),
  mk(3, "Lucía", "Paredes", "sales_advisor"),
  mk(4, "Andrés", "Quispe", "sales_advisor", { gender: "M" }),
  mk(5, "Camila", "Rojas", "sales_advisor", { activatedAt: null }),
  mk(6, "Jorge", "Medina", "sales_advisor", { gender: "M", isActive: false }),
];

const err = (
  status: number,
  code: string,
  message: string,
  fields: any[] = [],
): RawResponse => ({ status, json: { error: { code, message, fields } } });
const ok = (json: unknown, status = 200): RawResponse => ({ status, json });
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const profile = (e: Employee) => ({
  id: e.id,
  documentType: e.documentType,
  documentNumber: e.documentNumber,
  firstName: e.firstName,
  lastName: e.lastName,
  businessEmail: e.businessEmail,
  role: e.role,
});
const sessionFor = (e: Employee) =>
  ok({
    accessToken: "mock." + e.id,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    employee: profile(e),
  });
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const KEY = "ef_mock_session";

export async function mockTransport(
  method: string,
  path: string,
  headers: Record<string, string>,
  body: any,
): Promise<RawResponse> {
  await delay();
  const url = new URL(path, "http://mock");
  const p = url.pathname;
  const q = url.searchParams;
  const actor = employees.find(
    (e) =>
      "mock." + e.id === (headers.Authorization ?? "").replace("Bearer ", ""),
  );
  const m = `${method} ${p}`;

  if (m === "POST /auth/employee/login") {
    const e = employees.find(
      (x) =>
        x.documentType === body.documentType &&
        x.documentNumber === body.documentNumber,
    );
    if (!e || !e.isActive || !e.activatedAt || body.password !== DEMO_PASSWORD)
      return err(
        401,
        "INVALID_CREDENTIALS",
        "Documento o contraseña incorrectos.",
      );
    sessionStorage.setItem(KEY, e.id);
    return sessionFor(e);
  }
  if (m === "POST /auth/refresh") {
    const e = employees.find((x) => x.id === sessionStorage.getItem(KEY));
    return e && e.isActive
      ? sessionFor(e)
      : err(
          401,
          "SESSION_INVALID",
          "Su sesión terminó. Inicie sesión nuevamente.",
        );
  }
  if (m === "POST /auth/logout") {
    sessionStorage.removeItem(KEY);
    return { status: 204 };
  }
  if (m === "POST /auth/forgot-password")
    return ok({ status: "accepted" }, 202);
  if (m === "POST /auth/activate" || m === "POST /auth/reset-password") {
    if (body.token === "invalido")
      return err(
        422,
        "INVALID_LINK",
        "El enlace expiró o ya fue usado. Solicite uno nuevo a un administrador.",
      );
    if (String(body.password).length < 10)
      return err(
        422,
        "PASSWORD_TOO_WEAK",
        "La contraseña debe tener al menos 10 caracteres.",
      );
    return { status: 204 };
  }

  if (!actor)
    return err(
      401,
      "ACCESS_TOKEN_INVALID",
      "Su sesión terminó. Inicie sesión nuevamente.",
    );
  if (m === "GET /me") return ok(profile(actor));
  if (m === "PUT /me/password") {
    if (body.currentPassword !== DEMO_PASSWORD)
      return err(
        422,
        "INVALID_CURRENT_PASSWORD",
        "La contraseña actual no es correcta.",
      );
    sessionStorage.removeItem(KEY);
    return { status: 204 };
  }

  if (m === "GET /advisors") {
    if (actor.role === "sales_advisor")
      return err(403, "FORBIDDEN", "Su rol no permite esta acción.");
    return ok({
      items: employees
        .filter((e) => e.role === "sales_advisor" && e.isActive)
        .map((e) => ({
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
        })),
    });
  }

  if (p.startsWith("/employees")) {
    if (actor.role !== "system_admin")
      return err(403, "FORBIDDEN", "Su rol no permite esta acción.");
    const [, , id, action] = p.split("/");
    const target = employees.find((e) => e.id === id);

    if (!id) {
      if (method === "GET") {
        const term = norm(q.get("q") ?? "");
        const role = q.get("role");
        const status = q.get("status") ?? "all";
        const sort = q.get("sort") ?? "lastName";
        let list = employees.filter(
          (e) =>
            (!term ||
              norm(`${e.firstName} ${e.lastName}`).includes(term) ||
              e.documentNumber.startsWith(term) ||
              e.businessEmail.startsWith(term)) &&
            (!role || e.role === role) &&
            (status === "all" || (status === "active") === e.isActive),
        );
        list = [...list].sort(
          (a, b) =>
            (sort.endsWith("lastName")
              ? a.lastName.localeCompare(b.lastName)
              : a.createdAt.localeCompare(b.createdAt)) *
            (sort.startsWith("-") ? -1 : 1),
        );
        const page = Number(q.get("page") ?? 1),
          pageSize = Number(q.get("pageSize") ?? 20);
        return ok({
          items: list.slice((page - 1) * pageSize, page * pageSize),
          page,
          pageSize,
          total: list.length,
        });
      }
      if (method === "POST") {
        if (
          employees.some(
            (e) =>
              e.documentType === body.documentType &&
              e.documentNumber === body.documentNumber,
          )
        )
          return err(
            409,
            "EMPLOYEE_ALREADY_EXISTS",
            "Ya existe un empleado con ese documento.",
          );
        if (
          employees.some(
            (e) =>
              e.businessEmail.toLowerCase() ===
              String(body.businessEmail).toLowerCase(),
          )
        )
          return err(
            409,
            "EMPLOYEE_EMAIL_ALREADY_USED",
            "Ese correo corporativo ya está en uso.",
          );
        const e: Employee = {
          ...mk(0, body.firstName, body.lastName, body.role),
          ...body,
          id: uid(),
          activatedAt: null,
          isActive: true,
          version: 1,
          nameSource: "manual",
        };
        employees.push(e);
        return ok({ employee: e, activationLinkIssued: true }, 201);
      }
    }
    if (!target)
      return err(404, "EMPLOYEE_NOT_FOUND", "Empleado no encontrado.");
    const touch = () => {
      target.version++;
      target.updatedAt = now();
    };
    if (!action) {
      if (method === "GET") return ok(target);
      if (method === "PATCH") {
        if (body.version !== target.version)
          return err(
            409,
            "VERSION_CONFLICT",
            "Otro usuario modificó este registro; recargue para ver los cambios.",
          );
        if (
          target.role === "system_admin" &&
          body.role &&
          body.role !== "system_admin" &&
          employees.filter((e) => e.role === "system_admin" && e.isActive)
            .length === 1
        )
          return err(
            409,
            "LAST_ADMIN_PROTECTED",
            "No se puede cambiar el rol del último administrador activo.",
          );
        const { version: _v, ...rest } = body;
        Object.assign(target, rest);
        touch();
        return ok(target);
      }
      if (method === "DELETE") {
        if (!q.get("reason"))
          return err(
            422,
            "REASON_REQUIRED",
            "Indique el motivo de la eliminación.",
          );
        if (target.id === actor.id)
          return err(
            409,
            "CANNOT_DELETE_SELF",
            "No puede eliminar su propia cuenta.",
          );
        if (target.activatedAt)
          return err(
            409,
            "EMPLOYEE_HAS_HISTORY",
            "Este empleado ya inició sesión; desactívelo en lugar de eliminarlo.",
          );
        employees.splice(employees.indexOf(target), 1);
        return { status: 204 };
      }
    }
    if (method === "POST" && action === "deactivate") {
      if (target.id === actor.id)
        return err(
          409,
          "CANNOT_DEACTIVATE_SELF",
          "No puede desactivar su propia cuenta.",
        );
      if (!target.isActive)
        return err(
          409,
          "EMPLOYEE_ALREADY_INACTIVE",
          "El empleado ya está inactivo.",
        );
      if (
        target.role === "system_admin" &&
        employees.filter((e) => e.role === "system_admin" && e.isActive)
          .length === 1
      )
        return err(
          409,
          "LAST_ADMIN_PROTECTED",
          "No se puede desactivar al último administrador activo.",
        );
      target.isActive = false;
      touch();
      return ok(target);
    }
    if (method === "POST" && action === "reactivate") {
      if (target.isActive)
        return err(
          409,
          "EMPLOYEE_ALREADY_ACTIVE",
          "El empleado ya está activo.",
        );
      target.isActive = true;
      touch();
      return ok(target);
    }
    if (method === "POST" && action === "resend-activation") {
      if (target.activatedAt)
        return err(
          409,
          "EMPLOYEE_ALREADY_ACTIVATED",
          "El empleado ya activó su cuenta.",
        );
      return ok({ status: "accepted" }, 202);
    }
  }
  return err(404, "ROUTE_NOT_FOUND", "Ruta no encontrada.");
}
