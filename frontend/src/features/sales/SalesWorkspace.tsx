import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { Link } from "react-router-dom";

interface SaleItem {
  id: string;
  customerLegalNameSnapshot: string;
  vehicleModelNameSnapshot: string;
  vehicleVersionNameSnapshot: string;
  assignedAdvisorId: string;
  saleTemperature: "hot" | "warm" | "cold";
  overallState: "active" | "completed" | "cancelled";
  // Additional derived fields from v_sale_current_task would go here
}

export function SalesWorkspace() {
  const { data, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () =>
      apiClient
        .get("/sales", { params: { page: 1, pageSize: 20 } })
        .then((res) => res.data),
  });

  if (isLoading) return <div className="p-4">Cargando ventas...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ventas</h2>
        <Link
          to="/sales/new"
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Nueva venta
        </Link>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-zinc-50">
              <th className="p-3">Cliente</th>
              <th className="p-3">Vehículo</th>
              <th className="p-3">Temperatura</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((sale: SaleItem) => (
              <tr key={sale.id} className="border-b hover:bg-zinc-50">
                <td className="p-3">{sale.customerLegalNameSnapshot}</td>
                <td className="p-3">
                  {sale.vehicleModelNameSnapshot} -{" "}
                  {sale.vehicleVersionNameSnapshot}
                </td>
                <td className="p-3 capitalize">
                  {sale.saleTemperature === "hot"
                    ? "🔥 Caliente"
                    : sale.saleTemperature === "warm"
                      ? "☀️ Tibio"
                      : "❄️ Frío"}
                </td>
                <td className="p-3 capitalize">{sale.overallState}</td>
                <td className="p-3">
                  <Link
                    to={`/sales/${sale.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
            {data?.items?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-zinc-500">
                  Aún no tiene ventas asignadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
