import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { staffApi } from "../../shared/api/api";
import { ApiError, errorMessage, fieldErrors } from "../../shared/api/client";
import type { Employee, Role } from "../../shared/api/types";
import { fmtDateTime, fullName, todayISO } from "../../shared/format";
import { docTypeLabel, docTypes, roleLabel } from "../../shared/labels";
import {
  Banner,
  ConfirmModal,
  Field,
  PageHeader,
  ReasonModal,
  Skeleton,
  useToast,
  useUnsavedWarning,
} from "../../shared/ui/ui";
import { employeeStatus } from "./StaffListPage";
import { NotFoundPage } from "../../app/NotFound";

const docRules: Record<string, [RegExp, string]> = {
  DNI: [/^\d{8}$/, "El DNI tiene 8 dígitos."],
  CE: [
    /^[A-Za-z0-9]{9}$/,
    "El carné de extranjería tiene 9 caracteres alfanuméricos.",
  ],
  PAS: [
    /^[A-Za-z0-9]{6,12}$/,
    "El pasaporte tiene entre 6 y 12 caracteres alfanuméricos.",
  ],
};
const date = (label: string) =>
  z
    .string()
    .min(1, `Ingrese ${label}.`)
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.");
const schema = z
  .object({
    documentType: z.enum(["DNI", "CE", "PAS"]),
    documentNumber: z.string().trim().min(1, "Ingrese el número de documento."),
    firstName: z.string().trim().min(1, "Ingrese los nombres."),
    lastName: z.string().trim().min(1, "Ingrese los apellidos."),
    nationality: z.string().trim().min(1, "Ingrese la nacionalidad."),
    gender: z.enum(["M", "F"]),
    birthdate: date("la fecha de nacimiento").refine(
      (d) => d < todayISO(),
      "La fecha de nacimiento debe ser pasada.",
    ),
    hireDate: date("la fecha de ingreso"),
    personalPhone: z.string().trim().optional(),
    personalEmail: z
      .string()
      .trim()
      .email("Correo no válido.")
      .or(z.literal(""))
      .optional(),
    businessPhone: z.string().trim().min(1, "Ingrese el teléfono corporativo."),
    businessEmail: z
      .string()
      .trim()
      .min(1, "Ingrese el correo corporativo.")
      .email("Correo no válido."),
    role: z.enum(["system_admin", "sales_manager", "sales_advisor"]),
  })
  .superRefine((v, ctx) => {
    const [re, msg] = docRules[v.documentType];
    if (v.documentNumber && !re.test(v.documentNumber))
      ctx.addIssue({ code: "custom", path: ["documentNumber"], message: msg });
  });
type Values = z.infer<typeof schema>;

export function StaffFormPage() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ["employee", id],
    queryFn: () => staffApi.get(id!),
    enabled: !!id,
  });
  if (!id) return <EmployeeForm />;
  if (q.isLoading) return <Skeleton />;
  if (q.isError || !q.data) return <NotFoundPage />;
  return <EmployeeForm key={q.data.version} employee={q.data} />;
}

function EmployeeForm({ employee }: { employee?: Employee }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [banner, setBanner] = useState<{
    tone: "danger" | "warn";
    text: string;
    reload?: boolean;
  } | null>(null);
  const [modal, setModal] = useState<"deactivate" | "delete" | null>(null);
  const isNew = !employee;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, dirtyFields, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: employee
      ? {
          ...employee,
          personalPhone: employee.personalPhone ?? "",
          personalEmail: employee.personalEmail ?? "",
        }
      : {
          documentType: "DNI",
          nationality: "Peruana",
          gender: "F",
          role: "sales_advisor",
          personalPhone: "",
          personalEmail: "",
        },
  });
  useUnsavedWarning(isDirty);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["employee"] });
    qc.invalidateQueries({ queryKey: ["advisors"] });
  };

  const onError = (e: unknown) => {
    const fe = fieldErrors(e);
    Object.entries(fe).forEach(([f, m]) =>
      setError(f as keyof Values, { message: m }),
    );
    if (e instanceof ApiError && e.code === "VERSION_CONFLICT")
      setBanner({ tone: "warn", text: e.message, reload: true });
    else setBanner({ tone: "danger", text: errorMessage(e) });
  };

  const save = useMutation({
    mutationFn: async (v: Values) => {
      if (isNew) {
        return staffApi.create({
          ...v,
          personalPhone: v.personalPhone || null,
          personalEmail: v.personalEmail || null,
        });
      }
      const patch: Record<string, unknown> = { version: employee.version };
      (Object.keys(dirtyFields) as (keyof Values)[]).forEach((k) => {
        patch[k] = v[k] ?? "";
      });
      return staffApi.update(employee.id, patch as any);
    },
    onSuccess: (r: any) => {
      refresh();
      if (isNew) {
        toast(
          r.activationLinkIssued
            ? "Empleado creado. Se envió el enlace de activación."
            : "Empleado creado, pero no se pudo enviar el enlace. Reenvíelo desde su ficha.",
          r.activationLinkIssued ? "ok" : "warn",
        );
        nav(`/empleados/${r.employee.id}`, { replace: true });
      } else toast("Cambios guardados.");
    },
    onError,
  });
  const lifecycle = useMutation({
    mutationFn: (
      a: "deactivate" | "reactivate" | "resend",
    ): Promise<unknown> =>
      a === "deactivate"
        ? staffApi.deactivate(employee!.id)
        : a === "reactivate"
          ? staffApi.reactivate(employee!.id)
          : staffApi.resendActivation(employee!.id),
    onSuccess: (_r, a) => {
      refresh();
      toast(
        a === "resend"
          ? "Enlace de activación enviado."
          : a === "deactivate"
            ? "Empleado desactivado. Sus sesiones terminaron."
            : "Empleado reactivado.",
      );
    },
    onError,
  });

  return (
    <>
      <p className="crumb">
        <Link to="/empleados">← Empleados</Link>
      </p>
      <PageHeader
        title={isNew ? "Nuevo empleado" : fullName(employee)}
        sub={
          isNew ? (
            "Se enviará un enlace de activación al correo corporativo."
          ) : (
            <>
              {employeeStatus(employee)}{" "}
              <span className="muted">
                · creado el {fmtDateTime(employee.createdAt)}
              </span>
            </>
          )
        }
      >
        {!isNew && (
          <>
            {!employee.activatedAt && employee.isActive && (
              <button
                className="btn"
                onClick={() => lifecycle.mutate("resend")}
                disabled={lifecycle.isPending}
              >
                Reenviar activación
              </button>
            )}
            {employee.isActive ? (
              <button className="btn" onClick={() => setModal("deactivate")}>
                Desactivar
              </button>
            ) : (
              <button
                className="btn"
                onClick={() => lifecycle.mutate("reactivate")}
                disabled={lifecycle.isPending}
              >
                Reactivar
              </button>
            )}
            {!employee.activatedAt && (
              <button
                className="btn btn-danger-ghost"
                onClick={() => setModal("delete")}
              >
                Eliminar
              </button>
            )}
          </>
        )}
      </PageHeader>

      {banner && (
        <Banner tone={banner.tone}>
          {banner.text}{" "}
          {banner.reload && (
            <button
              className="link"
              onClick={() => {
                refresh();
                setBanner(null);
              }}
            >
              Recargar datos
            </button>
          )}
        </Banner>
      )}

      <form
        className="card form-grid"
        onSubmit={handleSubmit((v) => {
          setBanner(null);
          save.mutate(v);
        })}
        noValidate
      >
        <Field label="Tipo de documento">
          <select {...register("documentType")}>
            {docTypes.map((d) => (
              <option key={d} value={d}>
                {docTypeLabel[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Número de documento"
          error={errors.documentNumber?.message}
        >
          <input {...register("documentNumber")} />
        </Field>
        <Field label="Nombres" error={errors.firstName?.message}>
          <input {...register("firstName")} />
        </Field>
        <Field label="Apellidos" error={errors.lastName?.message}>
          <input {...register("lastName")} />
        </Field>
        <Field label="Género">
          <select {...register("gender")}>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </select>
        </Field>
        <Field label="Nacionalidad" error={errors.nationality?.message}>
          <input {...register("nationality")} />
        </Field>
        <Field label="Fecha de nacimiento" error={errors.birthdate?.message}>
          <input type="date" {...register("birthdate")} />
        </Field>
        <Field label="Fecha de ingreso" error={errors.hireDate?.message}>
          <input type="date" {...register("hireDate")} />
        </Field>
        <Field
          label="Correo corporativo"
          error={errors.businessEmail?.message}
          hint="Aquí llega el enlace de activación."
        >
          <input type="email" {...register("businessEmail")} />
        </Field>
        <Field
          label="Teléfono corporativo"
          error={errors.businessPhone?.message}
        >
          <input {...register("businessPhone")} />
        </Field>
        <Field
          label="Correo personal (opcional)"
          error={errors.personalEmail?.message}
        >
          <input type="email" {...register("personalEmail")} />
        </Field>
        <Field
          label="Teléfono personal (opcional)"
          error={errors.personalPhone?.message}
        >
          <input {...register("personalPhone")} />
        </Field>
        <Field
          label="Rol"
          className="span-2"
          hint="El último administrador activo no puede cambiar de rol."
        >
          <select {...register("role")}>
            {(Object.keys(roleLabel) as Role[]).map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-actions span-2">
          <Link className="btn" to="/empleados">
            Cancelar
          </Link>
          <button
            className="btn btn-primary"
            disabled={save.isPending || (!isNew && !isDirty)}
          >
            {save.isPending
              ? "Guardando…"
              : isNew
                ? "Crear empleado"
                : "Guardar cambios"}
          </button>
        </div>
      </form>

      {modal === "deactivate" && employee && (
        <ConfirmModal
          title="Desactivar empleado"
          confirmLabel="Desactivar"
          danger
          onClose={() => setModal(null)}
          message={`${fullName(employee)} no podrá iniciar sesión y sus sesiones abiertas terminarán. Si es asesor con ventas activas, primero reasigne esas ventas.`}
          onConfirm={() => lifecycle.mutateAsync("deactivate")}
        />
      )}
      {modal === "delete" && employee && (
        <ReasonModal
          title="Eliminar empleado"
          confirmLabel="Eliminar definitivamente"
          danger
          label="Motivo de la eliminación"
          onClose={() => setModal(null)}
          message="Es una acción excepcional y no se puede deshacer. Solo se permite si la persona nunca inició sesión. El motivo queda en la auditoría."
          onConfirm={async ({ reason }) => {
            await staffApi.remove(employee.id, reason);
            refresh();
            toast("Empleado eliminado.");
            nav("/empleados", { replace: true });
          }}
        />
      )}
    </>
  );
}
