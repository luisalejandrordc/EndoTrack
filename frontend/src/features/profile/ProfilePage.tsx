import { useState, type FormEvent } from "react";
import { api } from "../../shared/api/client";
import { roleLabel } from "../../shared/demo/data";
import { initials } from "../../shared/lib/format";
import { type EmployeeProfile } from "../../shared/types";
import { Field } from "../../shared/ui/Field";
import { Icon } from "../../shared/ui/Icon";
import { type Toast } from "../../shared/ui/toast";

export function ProfilePage({
  user,
  demo,
  onSignOut,
  toast,
}: {
  user: EmployeeProfile;
  demo: boolean;
  onSignOut: () => void;
  toast: (toast: Toast) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 10)
      return toast({
        title: "Contraseña muy corta",
        message: "Utiliza al menos 10 caracteres.",
        tone: "error",
      });
    if (newPassword !== confirmPassword)
      return toast({ title: "Las contraseñas no coinciden", tone: "error" });
    setSaving(true);
    try {
      if (demo)
        toast({
          title: "Contraseña actualizada (demo)",
          message: "No se modificó ninguna credencial real.",
          tone: "success",
        });
      else {
        await api.changePassword({ currentPassword, newPassword });
        toast({
          title: "Contraseña actualizada",
          message: "La sesión finalizará por seguridad.",
          tone: "success",
        });
        onSignOut();
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "No se pudo cambiar la contraseña",
        message:
          error instanceof Error ? error.message : "Inténtalo nuevamente.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page-stack profile-page">
      <div className="welcome-row">
        <div>
          <span className="section-kicker">CUENTA Y SEGURIDAD</span>
          <h2>Mi perfil</h2>
          <p>Consulta tus datos corporativos y administra tu acceso.</p>
        </div>
      </div>
      <section className="workspace-card profile-identity-card">
        <div className="profile-cover">
          <div className="profile-pattern pattern-left" />
          <div className="profile-pattern pattern-right" />
          <span className="profile-cover-label">
            <Icon name="shield-check" size={15} /> CUENTA CORPORATIVA
          </span>
        </div>
        <div className="profile-identity-main">
          <div className="profile-large-avatar">
            {initials(`${user.firstName} ${user.lastName}`)}
          </div>
          <div className="profile-name-block">
            <h3>
              {user.firstName} {user.lastName}
            </h3>
            <p>{user.businessEmail}</p>
            <div className="profile-badges">
              <span className={`role-badge role-${user.role}`}>
                {roleLabel[user.role]}
              </span>
              <span className="status-pill status-active">
                <i /> Cuenta activa
              </span>
            </div>
          </div>
          <button
            className="button button-secondary button-sm"
            onClick={() =>
              toast({
                title: "Edición de perfil",
                message:
                  "La API actual permite consultar datos y cambiar contraseña; la edición de datos se habilitará más adelante.",
                tone: "info",
              })
            }
          >
            <Icon name="edit" size={15} /> Editar perfil
          </button>
        </div>
        <div className="profile-details-grid">
          <ProfileData
            label="Documento de identidad"
            value={`${user.documentType} ${user.documentNumber}`}
          />
          <ProfileData label="Correo corporativo" value={user.businessEmail} />
          <ProfileData label="Rol del sistema" value={roleLabel[user.role]} />
          <ProfileData label="Identificador de cuenta" value={user.id} />
        </div>
      </section>
      <section className="workspace-card password-card">
        <div className="password-card-intro">
          <div className="password-icon">
            <Icon name="lock" size={21} />
          </div>
          <div>
            <h3>Cambiar contraseña</h3>
            <p>
              Te recomendamos utilizar una contraseña única de al menos 10
              caracteres.
            </p>
          </div>
        </div>
        <form onSubmit={submitPassword} className="password-change-form">
          <Field label="Contraseña actual">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <div className="password-change-divider" />
          <Field label="Nueva contraseña" hint="Mínimo 10 caracteres.">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar nueva contraseña">
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <div className="password-rules">
            <span>
              <Icon
                name={newPassword.length >= 10 ? "check-circle" : "circle"}
                size={14}
              />{" "}
              Al menos 10 caracteres
            </span>
            <span>
              <Icon
                name={
                  newPassword && confirmPassword === newPassword
                    ? "check-circle"
                    : "circle"
                }
                size={14}
              />{" "}
              Las contraseñas coinciden
            </span>
          </div>
          <div className="password-form-footer">
            <span>
              <Icon name="shield-check" size={15} /> Al cambiarla, se cerrarán
              las sesiones activas.
            </span>
            <button className="button button-primary" disabled={saving}>
              {saving ? "Guardando…" : "Actualizar contraseña"}{" "}
              <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </form>
      </section>
      <div className="profile-signout-row">
        <div>
          <strong>¿Terminaste por hoy?</strong>
          <span>Cierra tu sesión de forma segura en este dispositivo.</span>
        </div>
        <button className="button button-secondary" onClick={onSignOut}>
          <Icon name="logout" size={16} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export function ProfileData({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="profile-data-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
