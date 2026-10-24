import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient, setAccessToken } from "@/shared/api/client";

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const navLinks = [
    { path: "/sales", label: "Ventas" },
    { path: "/catalog", label: "Catálogo" },
    { path: "/employees", label: "Empleados" },
  ];

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="font-bold text-xl text-red-600">EndosoFlow</h1>

          <nav className="flex gap-4">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.path ||
                location.pathname.startsWith(`${link.path}/`);

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`font-medium pb-1 ${
                    isActive
                      ? "border-b-2 border-red-600 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

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
        <Outlet />
      </main>
    </div>
  );
}
