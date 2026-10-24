import { Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, setAccessToken } from "@/shared/api/client";

export function AppLayout() {
  const navigate = useNavigate();

  // Fetch current user details
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get("/me").then((res) => res.data),
  });

  const handleLogout = async () => {
    try {
      await apiClient.post(
        "/auth/logout",
        {},
        {
          headers: { "X-Requested-With": "EndosoFlow" },
        },
      );
    } finally {
      setAccessToken(null);
      navigate("/login");
    }
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
        {/* Replace with actual EndosoFlow logo component later */}
        <h1 className="font-bold text-xl">EndosoFlow</h1>
        <div className="flex items-center gap-4">
          <span>
            {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm underline text-zinc-600"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet /> {/* Renders Ventas, Clientes, etc. */}
      </main>
    </div>
  );
}
