import type { Role, VehicleModel } from "../../shared/types";
import type { Toast } from "../../shared/ui/toast";
import { DemoCatalogPage } from "./DemoCatalogPage";
import { LiveCatalogPage } from "./LiveCatalogPage";

/** The live catalog talks to the API; the demo catalog shows sample vehicles. */
export function CatalogPage({
  vehicles,
  query,
  demo,
  role,
  toast,
}: {
  vehicles: VehicleModel[];
  query: string;
  demo: boolean;
  role: Role;
  toast: (toast: Toast) => void;
}) {
  if (demo)
    return <DemoCatalogPage vehicles={vehicles} role={role} toast={toast} />;
  return <LiveCatalogPage query={query} role={role} toast={toast} />;
}
