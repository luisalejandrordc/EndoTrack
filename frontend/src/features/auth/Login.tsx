import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient, setAccessToken } from "@/shared/api/client";
import { useNavigate } from "react-router-dom";

// Validates shape locally before sending
const loginSchema = z.object({
  documentType: z.enum(["DNI", "CE", "PAS"]),
  documentNumber: z.string().min(1, "Requerido"),
  password: z.string().min(1, "Requerido"),
  rememberMe: z.boolean().default(false),
});

// Input values may omit rememberMe
type LoginFormInput = z.input<typeof loginSchema>;

// Validated output always has rememberMe as a boolean
type LoginFormValues = z.output<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();

  const form = useForm<LoginFormInput, any, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      documentType: "DNI",
      documentNumber: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    try {
      const response = await apiClient.post("/auth/employee/login", data);

      setAccessToken(response.data.accessToken);
      // Optional: Store response.data.employee in React Context or Zustand
      navigate("/sales");
    } catch (error: any) {
      const code = error.response?.data?.error?.code;

      if (code === "INVALID_CREDENTIALS" || code === "TOO_MANY_REQUESTS") {
        form.setError("root", {
          message: "Credenciales inválidas o cuenta bloqueada.",
        });
      } else {
        form.setError("root", {
          message: "Error al iniciar sesión.",
        });
      }
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 rounded bg-white p-8 shadow-md"
      >
        {/* Render shadcn/ui select for documentType, inputs for number/password */}
        {/* Render "Mantener sesión iniciada" checkbox */}

        {form.formState.errors.root && (
          <p className="text-red-600 text-sm">
            {form.formState.errors.root.message}
          </p>
        )}

        <button
          type="submit"
          className="bg-red-600 text-white p-2 rounded w-full"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  );
}
