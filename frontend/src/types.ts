export type Role = 'system_admin' | 'sales_manager' | 'sales_advisor';
export type DocumentType = 'DNI' | 'CE' | 'PAS';
export type SaleState = 'active' | 'completed' | 'cancelled';
export type TaskStatus = 'pending' | 'eligible' | 'in_progress' | 'completed';

export interface EmployeeProfile {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  businessEmail: string;
  role: Role;
}

export interface Employee extends EmployeeProfile {
  nationality: string;
  gender: 'M' | 'F';
  birthdate: string;
  hireDate: string;
  businessPhone: string;
  personalPhone?: string | null;
  personalEmail?: string | null;
  isActive: boolean;
  activatedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  accessToken: string;
  expiresAt: string;
  employee: EmployeeProfile;
}

export interface TaskItem {
  number: number;
  name: string;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  note?: string;
}

export interface Sale {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerType: string;
  vehicleModel: string;
  vehicleVersion: string;
  vehicleColor: string;
  vehicleImage: string;
  advisor: string;
  advisorId: string;
  temperature: 'hot' | 'warm' | 'cold';
  state: SaleState;
  createdAt: string;
  quotedPrice: number;
  notes: string;
  tasks: TaskItem[];
  milestones: string[];
}

export interface Customer {
  id: string;
  name: string;
  documentType: string;
  documentNumber: string;
  type: string;
  email: string;
  phone: string;
  active: boolean;
}

export interface VehicleModel {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  versions: { name: string; price: number }[];
  colors: string[];
  active: boolean;
}
