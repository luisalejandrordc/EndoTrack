import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/shared/api/client";

export function NewSaleWizard() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      customerDocType: "DNI",
      customerDocNumber: "",
      customerId: null, // Populated if lookup succeeds
      vehicleModelId: "",
      vehicleVersionId: "",
      vehicleColorId: "",
      saleTemperature: "warm",
      saleNotes: "",
    },
  });

  const handleCustomerLookup = async () => {
    const { customerDocType, customerDocNumber } = form.getValues();
    try {
      // Calls the Codart/internal lookup endpoint
      const res = await apiClient.get(`/customers/lookup`, {
        params: { type: customerDocType, number: customerDocNumber },
      });
      if (res.data.id) {
        form.setValue("customerId", res.data.id);
      }
      setStep(2);
    } catch (error) {
      // Fallback to manual entry if not found or quota exceeded
      alert("Cliente no encontrado. Procediendo a ingreso manual.");
      setStep(2);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const res = await apiClient.post("/sales", data);
      navigate(`/sales/${res.data.id}`); // Redirect to new sale detail with Task 1 eligible
    } catch (error) {
      alert("Error al crear la venta. Revise los datos.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Nueva venta - Paso {step} de 4</h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">1. Cliente</h3>
            {/* Replace with shadcn/ui inputs */}
            <input
              {...form.register("customerDocNumber")}
              placeholder="Número de documento"
              className="border p-2 w-full rounded"
            />
            <button
              type="button"
              onClick={handleCustomerLookup}
              className="bg-zinc-800 text-white p-2 rounded"
            >
              Buscar Cliente
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">2. Vehículo</h3>
            {/* These would be populated by fetching GET /catalog/selectable */}
            <select
              {...form.register("vehicleModelId")}
              className="border p-2 w-full rounded"
            >
              <option value="">Seleccione Modelo...</option>
              <option value="mock-id">Toyota Hilux (Mock)</option>
            </select>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="bg-zinc-800 text-white p-2 rounded"
            >
              Siguiente
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold">3. Datos de la venta</h3>
            <select
              {...form.register("saleTemperature")}
              className="border p-2 w-full rounded"
            >
              <option value="hot">🔥 Caliente</option>
              <option value="warm">☀️ Tibio</option>
              <option value="cold">❄️ Frío</option>
            </select>
            <textarea
              {...form.register("saleNotes")}
              placeholder="Notas internas (opcional)"
              className="border p-2 w-full rounded"
            />
            <button
              type="button"
              onClick={() => setStep(4)}
              className="bg-zinc-800 text-white p-2 rounded"
            >
              Revisar
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">4. Revisión</h3>
            <pre className="bg-zinc-100 p-2 text-sm">
              {JSON.stringify(form.getValues(), null, 2)}
            </pre>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="border border-zinc-300 p-2 rounded"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="bg-red-600 text-white p-2 rounded"
              >
                Confirmar y Crear
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
