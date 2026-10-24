import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient, setAccessToken } from "@/shared/api/client";
import { useNavigate } from "react-router-dom";

const loginSchema = z.object({
  documentType: z.enum(["DNI", "CE", "PAS"]),
  documentNumber: z.string().min(1, "Requerido"),
  password: z.string().min(1, "Requerido"),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      documentType: "DNI",
      documentNumber: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await apiClient.post("/auth/employee/login", data);
      setAccessToken(response.data.accessToken);
      navigate("/sales");
    } catch (error: any) {
      form.setError("root", {
        message: "Credenciales inválidas o cuenta bloqueada.",
      });
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-100">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 rounded bg-white p-8 shadow-md w-96 border border-zinc-200"
      >
        <h2 className="text-2xl font-bold text-center mb-6 text-red-600">
          EndosoFlow
        </h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">
            Tipo y Número de Documento
          </label>
          <div className="flex gap-2">
            <select
              {...form.register("documentType")}
              className="border border-zinc-300 rounded p-2 bg-white w-1/3 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="DNI">DNI</option>
              <option value="CE">CE</option>
              <option value="PAS">PAS</option>
            </select>
            <input
              type="text"
              {...form.register("documentNumber")}
              className="border border-zinc-300 rounded p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="Ej: 10000001"
            />
          </div>
          {form.formState.errors.documentNumber && (
            <p className="text-red-600 text-xs">El número es requerido</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">
            Contraseña
          </label>
          <input
            type="password"
            {...form.register("password")}
            className="border border-zinc-300 rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-red-600"
            placeholder="••••••••"
          />
          {form.formState.errors.password && (
            <p className="text-red-600 text-xs">La contraseña es requerida</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            {...form.register("rememberMe")}
            className="rounded border-zinc-300 text-red-600 focus:ring-red-600"
          />
          <label htmlFor="remember" className="text-sm text-zinc-700">
            Mantener sesión iniciada
          </label>
        </div>

        {form.formState.errors.root && (
          <p className="text-red-600 text-sm text-center font-medium bg-red-50 p-2 rounded">
            {form.formState.errors.root.message}
          </p>
        )}

        <button
          type="submit"
          className="bg-red-600 text-white p-2 rounded w-full font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Iniciando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
