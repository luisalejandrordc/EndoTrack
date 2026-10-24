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
import "../index.css";

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
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
