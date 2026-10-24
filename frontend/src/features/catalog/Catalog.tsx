import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export function Catalog() {
  const { data: models, isLoading } = useQuery({
    queryKey: ["vehicle-models"],
    queryFn: () => apiClient.get("/vehicle-models").then((res) => res.data),
  });

  if (isLoading) return <div className="p-4">Cargando catálogo...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catálogo de Vehículos</h2>
        {/* The New Model Wizard must capture Model, Version, Color, and Main Image in one flow */}
        <button className="bg-zinc-800 text-white px-4 py-2 rounded">
          Nuevo Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models?.items?.map((model: any) => (
          <div
            key={model.id}
            className="bg-white p-4 rounded shadow border border-zinc-100 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold">{model.modelName}</h3>
              <p className="text-zinc-600 text-sm mt-1">{model.description}</p>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span
                className={`px-2 py-1 rounded text-xs ${model.isActive ? "bg-green-100 text-green-800" : "bg-zinc-200 text-zinc-600"}`}
              >
                {model.isActive ? "Activo" : "Archivado"}
              </span>
              <button className="text-blue-600 text-sm hover:underline">
                Ver versiones
              </button>
            </div>
          </div>
        ))}
        {(!models?.items || models.items.length === 0) && (
          <div className="col-span-full p-4 text-center text-zinc-500 bg-white rounded shadow border border-dashed">
            No hay modelos registrados.
          </div>
        )}
      </div>
    </div>
  );
}
