import { request } from "./client";
import type { Advisor, CreateEmployeeRequest, DocumentType, Employee, EmployeeList, Profile, Role, SessionResponse, UpdateEmployeeRequest } from "./types";

export const authApi = {
  login: (b: { documentType: DocumentType; documentNumber: string; password: string; rememberMe: boolean }) =>
    request<SessionResponse>("/auth/employee/login", { method: "POST", body: b, auth: false }),
  logout: () => request<void>("/auth/logout", { method: "POST", csrf: true, auth: false }),
  activate: (b: { token: string; password: string }) => request<void>("/auth/activate", { method: "POST", body: b, auth: false }),
  forgot: (b: { documentType: DocumentType; documentNumber: string }) => request<{ status: "accepted" }>("/auth/forgot-password", { method: "POST", body: b, auth: false }),
  reset: (b: { token: string; password: string }) => request<void>("/auth/reset-password", { method: "POST", body: b, auth: false }),
  me: () => request<Profile>("/me"),
  changePassword: (b: { currentPassword: string; newPassword: string }) => request<void>("/me/password", { method: "PUT", body: b }),
};

export interface EmployeeQuery { q?: string; role?: Role | ""; status?: "all" | "active" | "inactive"; page?: number; pageSize?: number; sort?: string }
export const staffApi = {
  list: (query: EmployeeQuery) => request<EmployeeList>("/employees", { query: query as any }),
  get: (id: string) => request<Employee>(`/employees/${id}`),
  create: (b: CreateEmployeeRequest) => request<{ employee: Employee; activationLinkIssued: boolean }>("/employees", { method: "POST", body: b }),
  update: (id: string, b: UpdateEmployeeRequest) => request<Employee>(`/employees/${id}`, { method: "PATCH", body: b }),
  remove: (id: string, reason: string) => request<void>(`/employees/${id}`, { method: "DELETE", query: { reason } }),
  deactivate: (id: string) => request<Employee>(`/employees/${id}/deactivate`, { method: "POST" }),
  reactivate: (id: string) => request<Employee>(`/employees/${id}/reactivate`, { method: "POST" }),
  resendActivation: (id: string) => request<{ status: "accepted" }>(`/employees/${id}/resend-activation`, { method: "POST" }),
  advisors: () => request<{ items: Advisor[] }>("/advisors"),
};
