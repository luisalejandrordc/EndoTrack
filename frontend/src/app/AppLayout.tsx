import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { apiClient, setAccessToken } from "@/shared/api/client";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        // 1. On full reload, ask Go backend for a new access token via the HttpOnly cookie
        const refreshRes = await apiClient.post(
          "/auth/refresh",
          {},
          {
            headers: { "X-Requested-With": "EndosoFlow" },
          },
        );
        setAccessToken(refreshRes.data.accessToken);

        // 2. Fetch the employee profile with the restored token
        const userRes = await apiClient.get("/me");
        setUser(userRes.data);
      } catch (error) {
        // If no valid cookie exists, force login
        navigate("/login");
      } finally {
        setIsInitializing(false);
      }
    };
    initSession();
  }, [navigate]);

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

  const navLinks = [
    { path: "/sales", label: "Ventas" },
    { path: "/catalog", label: "Catálogo" },
    { path: "/employees", label: "Empleados" },
  ];

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-100">
        Cargando sesión...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="font-bold text-xl text-red-600">EndosoFlow</h1>
          <nav className="flex gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-medium pb-1 transition-colors ${location.pathname.startsWith(link.path) ? "border-b-2 border-red-600 text-zinc-900" : "text-zinc-500 hover:text-zinc-900"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-zinc-700">
            {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm border border-zinc-300 px-3 py-1 rounded hover:bg-zinc-50"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
