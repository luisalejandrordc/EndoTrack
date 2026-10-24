import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { Link } from "react-router-dom";

export function StaffDirectory() {
  const { data: staff, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () =>
      apiClient
        .get("/employees", { params: { page: 1, pageSize: 20 } })
        .then((res) => res.data),
  });

  if (isLoading) return <div className="p-4">Cargando empleados...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Empleados</h2>
        <Link
          to="/employees/new"
          className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition-colors"
        >
          Nuevo Empleado
        </Link>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-zinc-50">
              <th className="p-3">Nombre</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Email Corporativo</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {staff?.items?.map((emp: any) => (
              <tr key={emp.id} className="border-b hover:bg-zinc-50">
                <td className="p-3">
                  {emp.firstName} {emp.lastName}
                </td>
                <td className="p-3">
                  {emp.documentType} {emp.documentNumber}
                </td>
                <td className="p-3">{emp.businessEmail}</td>
                <td className="p-3 capitalize">{emp.role.replace("_", " ")}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-sm ${emp.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    {emp.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
