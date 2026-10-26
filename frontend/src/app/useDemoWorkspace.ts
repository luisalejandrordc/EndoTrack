import { useState } from "react";
import type { NewSaleDraft } from "../features/sales/NewSaleWizard";
import { buildSaleFromDraft } from "../features/sales/saleActions";
import {
  demoCustomers,
  demoEmployees,
  demoSales,
  demoVehicles,
} from "../shared/demo/data";
import type { Customer, Employee, Sale, VehicleModel } from "../shared/types";

/**
 * DEMO-ONLY data store held in React state (resets on reload).
 *
 * Each resource moves out of this hook, one by one, as its API routes land in
 * backend/api/openapi.yaml: staff already uses the live API, customers and
 * catalog are next (sub-phase 1E), sales and tasks follow in 1G.
 */
export function useDemoWorkspace() {
  const [sales, setSales] = useState<Sale[]>(demoSales);
  const [customers, setCustomers] = useState<Customer[]>(demoCustomers);
  const [vehicles] = useState<VehicleModel[]>(demoVehicles);
  const [employees] = useState<Employee[]>(demoEmployees);
  const [activeSaleId, setActiveSaleId] = useState("sale-001");

  const activeSale = sales.find((sale) => sale.id === activeSaleId) || sales[0];

  function updateSale(saleId: string, change: (sale: Sale) => Sale) {
    setSales((old) =>
      old.map((sale) => (sale.id === saleId ? change(sale) : sale)),
    );
  }

  function saveNotes(saleId: string, notes: string) {
    updateSale(saleId, (sale) => ({ ...sale, notes }));
  }

  function createSale(draft: NewSaleDraft): Sale {
    let customerId = draft.customerId;
    if (!customerId) {
      const newId = `cus-${Date.now()}`;
      customerId = newId;
      setCustomers((old) => [
        ...old,
        {
          id: newId,
          name: draft.customerName,
          documentType: draft.documentType,
          documentNumber: draft.documentNumber,
          type: draft.customerType,
          email: draft.email,
          phone: draft.phone,
          active: true,
        },
      ]);
    }
    const sale = buildSaleFromDraft(draft, customerId, sales.length);
    setSales((old) => [sale, ...old]);
    setActiveSaleId(sale.id);
    return sale;
  }

  return {
    sales,
    customers,
    vehicles,
    employees,
    activeSale,
    setActiveSaleId,
    updateSale,
    saveNotes,
    createSale,
  };
}
