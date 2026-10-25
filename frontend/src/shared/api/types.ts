// Types mirror openapi.yaml (the source of truth). Replace with the generated client when it exists.
export type Role = "system_admin" | "sales_manager" | "sales_advisor";
export type DocumentType = "DNI" | "CE" | "PAS";

export interface Profile {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  businessEmail: string;
  role: Role;
}
export interface SessionResponse {
  accessToken: string;
  expiresAt: string;
  employee: Profile;
}

export interface Employee extends Profile {
  nameSource: "manual" | "looked_up";
  nationality: string;
  gender: "M" | "F";
  birthdate: string;
  hireDate: string;
  personalPhone?: string | null;
  personalEmail?: string | null;
  businessPhone: string;
  isActive: boolean;
  activatedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface EmployeeList {
  items: Employee[];
  page: number;
  pageSize: number;
  total: number;
}
export interface CreateEmployeeRequest {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  nationality: string;
  gender: "M" | "F";
  birthdate: string;
  hireDate: string;
  personalPhone?: string | null;
  personalEmail?: string | null;
  businessPhone: string;
  businessEmail: string;
  role: Role;
}
export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest> & {
  version: number;
};
export interface Advisor {
  id: string;
  firstName: string;
  lastName: string;
}
export interface FieldError {
  field: string;
  code: string;
  message: string;
}
