import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";

export function TaskAccordion({ saleId }: { saleId: string }) {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", saleId],
    queryFn: () =>
      apiClient.get(`/sales/${saleId}/tasks`).then((res) => res.data),
  });

  const startTaskMutation = useMutation({
    mutationFn: (taskNumber: number) =>
      apiClient.post(`/sales/${saleId}/tasks/${taskNumber}/start`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tasks", saleId] }),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (taskNumber: number) =>
      apiClient.post(`/sales/${saleId}/tasks/${taskNumber}/complete`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tasks", saleId] }),
  });

  if (isLoading) return <div>Cargando tareas...</div>;

  return (
    <div className="space-y-4">
      {tasks?.map((task: any) => (
        <div
          key={task.taskNumber}
          className="border rounded bg-white overflow-hidden shadow-sm"
        >
          {/* Task Header */}
          <div className="p-4 bg-white flex justify-between items-center border-b">
            <h3 className="font-semibold text-lg">
              Tarea {task.taskNumber}:{" "}
              {task.status === "pending"
                ? "Pendiente"
                : task.status === "in_progress"
                  ? "En Progreso"
                  : "Completada"}
            </h3>
            <span
              className={`px-2 py-1 rounded text-sm ${
                task.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : task.status === "in_progress"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-zinc-100"
              }`}
            >
              {task.status}
            </span>
          </div>

          {/* Task Body (Only expanded if in progress or next eligible) */}
          {(task.status === "in_progress" ||
            (task.status === "pending" && task.isEligible)) && (
            <div className="p-4 bg-zinc-50 space-y-4">
              {task.status === "pending" && task.isEligible && (
                <div>
                  <p className="text-zinc-600 mb-4">
                    Esta tarea está lista para iniciar.
                  </p>
                  <button
                    onClick={() => startTaskMutation.mutate(task.taskNumber)}
                    disabled={startTaskMutation.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Iniciar Tarea
                  </button>
                </div>
              )}

              {task.status === "in_progress" && (
                <div>
                  {/* Provisional Form Placeholder based on taskNumber */}
                  <div className="mb-4 p-4 border border-dashed border-zinc-300 rounded text-center text-zinc-500 bg-white">
                    Formulario de Tarea {task.taskNumber} <br />
                    (Campos de datos y carga de documentos irían aquí)
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        completeTaskMutation.mutate(task.taskNumber)
                      }
                      disabled={completeTaskMutation.isPending}
                      className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                      Completar Tarea
                    </button>
                    {/* Restart requires a reason modal in the full build */}
                    <button className="border border-zinc-300 px-4 py-2 rounded bg-white hover:bg-zinc-50">
                      Reiniciar Tarea
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
