import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../../shared/api/api";
import { errorMessage, fieldErrors } from "../../shared/api/client";
import { initials, fullName } from "../../shared/format";
import { roleLabel } from "../../shared/labels";
import { Banner, Field, PageHeader } from "../../shared/ui/ui";
import { useAuth } from "../auth/AuthContext";

const schema = z.object({
  currentPassword: z.string().min(1, "Ingrese su contraseña actual."),
  newPassword: z.string().min(10, "Use al menos 10 caracteres.").max(128, "Use como máximo 128 caracteres."),
  confirm: z.string(),
}).refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden." })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "La nueva contraseña debe ser distinta de la actual." });

export function ProfilePage() {
  const { user, logout, endSession } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  if (!user) return null;
  const submit = handleSubmit(async (v) => {
    setError("");
    try {
      await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      endSession(); // the server ended every session, including this one
      nav("/iniciar-sesion", { replace: true, state: { flash: "Su contraseña cambió. Inicie sesión nuevamente." } });
    } catch (e) {
      const fe = fieldErrors(e);
      if (fe.currentPassword) setFieldError("currentPassword", { message: fe.currentPassword });
      setError(errorMessage(e));
    }
  });
  return (
    <>
      <PageHeader title="Mi perfil"><button className="btn" onClick={() => logout().then(() => nav("/iniciar-sesion"))}>Cerrar sesión</button></PageHeader>
      <div className="grid-2 align-start">
        <section className="card">
          <div className="profile-head">
            <span className="avatar avatar-lg" aria-hidden>{initials(user.firstName, user.lastName)}</span>
            <div><h2>{fullName(user)}</h2><p className="muted">{roleLabel[user.role]}</p></div>
          </div>
          <dl className="dl">
            <dt>Documento</dt><dd className="num">{user.documentType} {user.documentNumber}</dd>
            <dt>Correo corporativo</dt><dd>{user.businessEmail}</dd>
            <dt>Rol</dt><dd>{roleLabel[user.role]}</dd>
          </dl>
          <p className="hint">La foto de perfil se habilitará cuando el módulo de documentos esté listo.</p>
        </section>
        <section className="card">
          <h2>Cambiar contraseña</h2>
          <p className="muted">Al cambiarla se cerrarán todas sus sesiones, incluida esta.</p>
          <form className="stack" onSubmit={submit} noValidate>
            <Field label="Contraseña actual" error={errors.currentPassword?.message}><input type="password" autoComplete="current-password" {...register("currentPassword")} /></Field>
            <Field label="Nueva contraseña" error={errors.newPassword?.message}><input type="password" autoComplete="new-password" {...register("newPassword")} /></Field>
            <Field label="Repita la nueva contraseña" error={errors.confirm?.message}><input type="password" autoComplete="new-password" {...register("confirm")} /></Field>
            {error && !errors.currentPassword && <Banner tone="danger">{error}</Banner>}
            <button className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Cambiar contraseña"}</button>
          </form>
        </section>
      </div>
    </>
  );
}
