import { Navigate, Route, Routes } from "react-router-dom";
import {
  ForgotPasswordPage,
  LoginPage,
  SetPasswordPage,
} from "../features/auth/AuthPages";
import { CatalogPage } from "../features/catalog/CatalogPage";
import { CustomersPage } from "../features/customers/CustomersPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { NewSalePage } from "../features/sales/NewSalePage";
import { SaleDetailPage } from "../features/sales/SaleDetailPage";
import { SalesPage } from "../features/sales/SalesPage";
import { StaffFormPage } from "../features/staff/StaffFormPage";
import { StaffListPage } from "../features/staff/StaffListPage";
import { RequireAdmin, RequireAuth, WakeBanner } from "./AppShell";
import { NotFoundPage } from "./NotFound";

export function App() {
  return (
    <>
      <WakeBanner />
      <Routes>
        <Route path="/iniciar-sesion" element={<LoginPage />} />
        <Route
          path="/definir-contrasena"
          element={<SetPasswordPage mode="activate" />}
        />
        <Route path="/olvide-mi-contrasena" element={<ForgotPasswordPage />} />
        <Route
          path="/restablecer-contrasena"
          element={<SetPasswordPage mode="reset" />}
        />
        <Route element={<RequireAuth />}>
          <Route index element={<Navigate to="/ventas" replace />} />
          <Route path="/ventas" element={<SalesPage />} />
          <Route path="/ventas/nueva" element={<NewSalePage />} />
          <Route path="/ventas/:id" element={<SaleDetailPage />} />
          <Route path="/clientes" element={<CustomersPage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/empleados" element={<StaffListPage />} />
            <Route path="/empleados/nuevo" element={<StaffFormPage />} />
            <Route path="/empleados/:id" element={<StaffFormPage />} />
          </Route>
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
