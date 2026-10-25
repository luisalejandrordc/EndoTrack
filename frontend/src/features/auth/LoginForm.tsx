import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { errorMessage } from "../../shared/api/client";
import { docTypeLabel, docTypes } from "../../shared/labels";
import { Banner, Field } from "../../shared/ui/ui";
import { useAuth } from "./AuthContext";
import { useState } from "react";

const schema = z.object({
  documentType: z.enum(["DNI", "CE", "PAS"]),
  documentNumber: z.string().trim().min(1, "Ingrese su número de documento."),
  password: z.string().min(1, "Ingrese su contraseña."),
  rememberMe: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function LoginForm({
  onDone,
  compact,
}: {
  onDone?: () => void;
  compact?: boolean;
}) {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      documentType: "DNI",
      documentNumber: "",
      password: "",
      rememberMe: false,
    },
  });
  const submit = handleSubmit(async (v) => {
    setError("");
    try {
      await login(v);
      onDone?.();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
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
          <input
            {...register("documentNumber")}
            inputMode="text"
            autoComplete="username"
            autoFocus
          />
        </Field>
      </div>
      <Field label="Contraseña" error={errors.password?.message}>
        <input
          type="password"
          {...register("password")}
          autoComplete="current-password"
        />
      </Field>
      <label className="check">
        <input type="checkbox" {...register("rememberMe")} /> Mantener sesión
        iniciada
      </label>
      {error && <Banner tone="danger">{error}</Banner>}
      <button className="btn btn-primary btn-block" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
      </button>
      {!compact && (
        <Link to="/olvide-mi-contrasena" className="center">
          ¿Olvidó su contraseña?
        </Link>
      )}
    </form>
  );
}
