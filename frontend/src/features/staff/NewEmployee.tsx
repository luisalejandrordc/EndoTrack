import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient } from "@/shared/api/client";
import { useNavigate, Link } from "react-router-dom";

const newEmployeeSchema = z.object({
  documentType: z.enum(["DNI", "CE", "PAS"]),
  documentNumber: z.string().min(1, "Requerido"),
  firstName: z.string().min(1, "Requerido"),
  lastName: z.string().min(1, "Requerido"),
  nationality: z.string().min(1, "Requerido"),
  gender: z.enum(["M", "F"]),
  birthdate: z.string().min(1, "Requerido"),
  hireDate: z.string().min(1, "Requerido"),
  businessPhone: z.string().min(1, "Requerido"),
  businessEmail: z.string().email("Email inválido"),
  role: z.enum(["system_admin", "sales_manager", "sales_advisor"]),
});

type NewEmployeeValues = z.infer<typeof newEmployeeSchema>;

export function NewEmployee() {
  const navigate = useNavigate();
  const form = useForm<NewEmployeeValues>({
    resolver: zodResolver(newEmployeeSchema),
    defaultValues: {
      documentType: "DNI",
      gender: "M",
      role: "sales_advisor",
      nationality: "Peruana", // sensible default
    },
  });

  const onSubmit = async (data: NewEmployeeValues) => {
    try {
      // Sends payload to POST /api/v1/employees
      await apiClient.post("/employees", data);
      navigate("/employees");
    } catch (error: any) {
      form.setError("root", {
        message:
          error.response?.data?.error?.message || "Error al crear el empleado.",
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Registrar Nuevo Empleado</h2>
        <Link to="/employees" className="text-zinc-500 hover:underline">
          Volver a la lista
        </Link>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="bg-white p-6 rounded shadow border border-zinc-200 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Documento</label>
            <div className="flex gap-2">
              <select
                {...form.register("documentType")}
                className="border rounded p-2 bg-white w-1/3"
              >
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="PAS">PAS</option>
              </select>
              <input
                type="text"
                {...form.register("documentNumber")}
                className="border rounded p-2 flex-1"
                placeholder="Número"
              />
            </div>
            {form.formState.errors.documentNumber && (
              <p className="text-red-600 text-xs">Requerido</p>
            )}
          </div>

          {/* Names */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombres y Apellidos</label>
            <div className="flex gap-2">
              <input
                type="text"
                {...form.register("firstName")}
                className="border rounded p-2 w-1/2"
                placeholder="Nombres"
              />
              <input
                type="text"
                {...form.register("lastName")}
                className="border rounded p-2 w-1/2"
                placeholder="Apellidos"
              />
            </div>
          </div>

          {/* Personal Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nacionalidad y Género</label>
            <div className="flex gap-2">
              <input
                type="text"
                {...form.register("nationality")}
                className="border rounded p-2 w-2/3"
                placeholder="Nacionalidad"
              />
              <select
                {...form.register("gender")}
                className="border rounded p-2 bg-white w-1/3"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Fechas (Nacimiento / Contratación)
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                {...form.register("birthdate")}
                className="border rounded p-2 w-1/2"
              />
              <input
                type="date"
                {...form.register("hireDate")}
                className="border rounded p-2 w-1/2"
              />
            </div>
          </div>

          {/* Contact & Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contacto Corporativo</label>
            <div className="flex gap-2">
              <input
                type="tel"
                {...form.register("businessPhone")}
                className="border rounded p-2 w-1/3"
                placeholder="Teléfono"
              />
              <input
                type="email"
                {...form.register("businessEmail")}
                className="border rounded p-2 flex-1"
                placeholder="Email"
              />
            </div>
            {form.formState.errors.businessEmail && (
              <p className="text-red-600 text-xs">Email inválido</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rol del Sistema</label>
            <select
              {...form.register("role")}
              className="border rounded p-2 bg-white w-full"
            >
              <option value="sales_advisor">Asesor de Ventas</option>
              <option value="sales_manager">Gerente de Ventas</option>
              <option value="system_admin">Administrador del Sistema</option>
            </select>
          </div>
        </div>

        {form.formState.errors.root && (
          <p className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-red-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
          >
            {form.formState.isSubmitting ? "Guardando..." : "Crear Empleado"}
          </button>
        </div>
      </form>
    </div>
  );
}
