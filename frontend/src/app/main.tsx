import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./AppLayout";
import { Login } from "@/features/auth/Login";
import { SalesWorkspace } from "@/features/sales/SalesWorkspace";
import { NewSaleWizard } from "@/features/sales/NewSaleWizard";
import { SaleDetail } from "@/features/sales/SaleDetail";
import { StaffDirectory } from "@/features/staff/StaffDirectory";
import { Catalog } from "@/features/catalog/Catalog";
import "../index.css";
import { NewEmployee } from "@/features/staff/NewEmployee";

// Start MSW only when VITE_USE_MOCKS=true
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCKS !== "true") {
    return;
  }

  const { worker } = await import("@/shared/api/mocks/browser");

  return worker.start({
    onUnhandledRequest: "bypass",
  });
}

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/sales" replace /> },
      { path: "sales", element: <SalesWorkspace /> },
      { path: "sales/new", element: <NewSaleWizard /> },
      { path: "sales/:id", element: <SaleDetail /> },
      { path: "employees", element: <StaffDirectory /> },
      { path: "employees/new", element: <NewEmployee /> },
      { path: "catalog", element: <Catalog /> },
    ],
  },
]);

// Initialize MSW before rendering the application
enableMocking()
  .then(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    );
  })
  .catch((error) => {
    console.error("Failed to initialize application:", error);
  });
