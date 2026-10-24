import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { TaskAccordion } from "@/features/tasks/TaskAccordion";

export function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<
    "tareas" | "documentos" | "notas" | "historial"
  >("tareas");

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => apiClient.get(`/sales/${id}`).then((res) => res.data),
  });

  if (isLoading) return <div className="p-4">Cargando detalle de venta...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded shadow flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">
            {sale?.customerLegalNameSnapshot}
          </h2>
          <p className="text-zinc-600">
            {sale?.vehicleModelNameSnapshot} -{" "}
            {sale?.vehicleVersionNameSnapshot} ({sale?.vehicleColorNameSnapshot}
            )
          </p>
          <div className="mt-2 flex gap-2">
            <span className="bg-zinc-100 px-2 py-1 rounded text-sm capitalize">
              Estado: {sale?.overallState}
            </span>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm capitalize">
              Temp: {sale?.saleTemperature}
            </span>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="flex gap-2">
          {sale?.overallState === "active" && (
            <button className="border border-red-600 text-red-600 px-3 py-1 rounded hover:bg-red-50">
              Cancelar Venta
            </button>
          )}
          <button className="border border-zinc-300 px-3 py-1 rounded hover:bg-zinc-50">
            Reasignar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="flex border-b">
          {["tareas", "documentos", "notas", "historial"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 text-center font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-red-600 text-red-600 bg-red-50/50"
                  : "text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6 bg-zinc-50/50">
          {activeTab === "tareas" && <TaskAccordion saleId={id!} />}
          {activeTab === "documentos" && (
            <div>Panel de Documentos (Próximamente)</div>
          )}
          {activeTab === "notas" && <div>Notas internas (Próximamente)</div>}
          {activeTab === "historial" && (
            <div>Historial de auditoría (Próximamente)</div>
          )}
        </div>
      </div>
    </div>
  );
}
