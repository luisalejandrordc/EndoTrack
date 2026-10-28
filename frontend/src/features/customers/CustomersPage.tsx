import type { Customer, Role } from "../../shared/types";
import type { Toast } from "../../shared/ui/toast";
import { DemoCustomersPage } from "./DemoCustomersPage";
import { LiveCustomersPage } from "./LiveCustomersPage";

/** The live directory talks to the API; the demo directory shows sample data. */
export function CustomersPage({
  customers,
  query,
  onNewSale,
  demo,
  role,
  toast,
}: {
  customers: Customer[];
  query: string;
  onNewSale: (customer?: Customer) => void;
  demo: boolean;
  role: Role;
  toast: (toast: Toast) => void;
}) {
  if (demo)
    return (
      <DemoCustomersPage
        customers={customers}
        query={query}
        onNewSale={onNewSale}
        role={role}
      />
    );
  return <LiveCustomersPage query={query} role={role} toast={toast} />;
}
