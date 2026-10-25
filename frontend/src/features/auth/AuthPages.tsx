import { zodResolver } from "@hookform/resolvers/zod";
import { ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { z } from "zod";
import { authApi } from "../../shared/api/api";
import { ApiError, errorMessage, MOCK_ALL } from "../../shared/api/client";
import { docTypeLabel, docTypes } from "../../shared/labels";
import { Banner, Field, Modal } from "../../shared/ui/ui";
import { useAuth } from "./AuthContext";
import { LoginForm } from "./LoginForm";

/** Public pages share one frame: a quiet form beside the brand route line. */
function Frame({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-frame">
      <section className="auth-brand" aria-hidden>
        <div className="brand-mark">
          <i />
          <i />
          <i />
        </div>
        <p className="auth-wordmark">EndosoFlow</p>
        <p className="auth-tag">
          De la cotización a la entrega, cada trámite en su lugar.
        </p>
        <svg className="route" viewBox="0 0 400 60" fill="none">
          <path
            d="M6 40 H120 L150 14 H250 L280 40 H394"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
          <circle cx="6" cy="40" r="5" fill="currentColor" />
          <circle cx="200" cy="14" r="5" fill="currentColor" />
          <circle cx="394" cy="40" r="5" fill="currentColor" />
        </svg>
      </section>
      <section className="auth-panel">
        <div className="auth-card stack">
          <h1>{title}</h1>
          {intro && <p className="muted">{intro}</p>}
          {children}
        </div>
      </section>
    </main>
  );
}

export function LoginPage() {
  const { status } = useAuth();
  const loc = useLocation();
  const flash = (loc.state as any)?.flash as string | undefined;
  const from = (loc.state as any)?.from as string | undefined;
  if (status === "authenticated")
    return <Navigate to={from ?? "/ventas"} replace />;
  return (
    <Frame
      title="Iniciar sesión"
      intro="Ingrese con el documento registrado en su cuenta de empleado."
    >
      {flash && <Banner tone="ok">{flash}</Banner>}
      {MOCK_ALL && (
        <Banner tone="info">
          Modo demostración sin servidor. Use DNI 10000001 (administrador),
          10000002 (gerente) o 10000003 (asesora) con la contraseña{" "}
          <code>demo-password-1</code>.
        </Banner>
      )}
      <LoginForm />
    </Frame>
  );
}

export function ReloginModal() {
  return (
    <Modal title="Su sesión terminó" onClose={() => {}}>
      <div className="stack">
        <p>
          Vuelva a ingresar para continuar. Lo que escribió en la pantalla se
          conserva.
        </p>
        <LoginForm compact />
      </div>
    </Modal>
  );
}

const strength = (p: string) => {
  const score = [
    p.length >= 10,
    p.length >= 14,
    /[A-Z]/.test(p) && /[a-z]/.test(p),
    /\d/.test(p),
    /[^A-Za-z0-9]/.test(p),
  ].filter(Boolean).length;
  return p.length === 0
    ? null
    : p.length < 10
      ? { label: "Muy corta", pct: 15, tone: "danger" }
      : score <= 2
        ? { label: "Aceptable", pct: 45, tone: "warn" }
        : score === 3
          ? { label: "Buena", pct: 75, tone: "ok" }
          : { label: "Muy buena", pct: 100, tone: "ok" };
};

const pwSchema = z
  .object({
    password: z
      .string()
      .min(10, "Use al menos 10 caracteres.")
      .max(128, "Use como máximo 128 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });
type PwValues = z.infer<typeof pwSchema>;

/** Used for both the activation link (first password) and the reset link. */
export function SetPasswordPage({ mode }: { mode: "activate" | "reset" }) {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const nav = useNavigate();
  const [error, setError] = useState<ApiError | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PwValues>({ resolver: zodResolver(pwSchema) });
  const s = strength(watch("password") ?? "");
  const title =
    mode === "activate" ? "Definir contraseña" : "Restablecer contraseña";
  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await (mode === "activate" ? authApi.activate : authApi.reset)({
        token,
        password: v.password,
      });
      nav("/iniciar-sesion", {
        replace: true,
        state: {
          flash:
            mode === "activate"
              ? "Su contraseña quedó definida. Ya puede iniciar sesión."
              : "Su contraseña cambió. Inicie sesión con la nueva.",
        },
      });
    } catch (e) {
      setError(e as ApiError);
    }
  });
  if (!token)
    return (
      <Frame title={title}>
        <Banner tone="danger">
          Este enlace está incompleto. Abra el enlace tal como llegó a su correo
          corporativo.
        </Banner>
        <Link to="/iniciar-sesion">Ir a iniciar sesión</Link>
      </Frame>
    );
  return (
    <Frame
      title={title}
      intro="Use al menos 10 caracteres. Mezcle letras, números y símbolos para una contraseña más segura."
    >
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Nueva contraseña" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
        </Field>
        {s && (
          <div className="meter" aria-live="polite">
            <div
              className={`meter-bar tone-${s.tone}`}
              style={{ width: `${s.pct}%` }}
            />
            <small>{s.label}</small>
          </div>
        )}
        <Field label="Repita la contraseña" error={errors.confirm?.message}>
          <input
            type="password"
            autoComplete="new-password"
            {...register("confirm")}
          />
        </Field>
        {error && (
          <Banner tone="danger">
            {error.message}{" "}
            {error.code === "INVALID_LINK" &&
              (mode === "reset" ? (
                <Link to="/olvide-mi-contrasena">
                  Solicitar un enlace nuevo
                </Link>
              ) : (
                "Pida a un administrador que le envíe un enlace nuevo."
              ))}
          </Banner>
        )}
        <button className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </Frame>
  );
}

const forgotSchema = z.object({
  documentType: z.enum(["DNI", "CE", "PAS"]),
  documentNumber: z.string().trim().min(1, "Ingrese su número de documento."),
});
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { documentType: "DNI" },
  });
  const submit = handleSubmit(async (v) => {
    setError("");
    try {
      await authApi.forgot(v);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Frame
      title="Olvidé mi contraseña"
      intro="Indique su documento. Si la cuenta existe, enviaremos un enlace válido por 1 hora al correo corporativo."
    >
      {sent ? (
        <Banner tone="ok">
          Si el documento corresponde a una cuenta, recibirá un correo con el
          enlace para restablecer su contraseña.
        </Banner>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <div className="grid-2 id-row">
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
          </div>
          {error && <Banner tone="danger">{error}</Banner>}
          <button className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}
      <Link to="/iniciar-sesion" className="center">
        Volver a iniciar sesión
      </Link>
    </Frame>
  );
}
