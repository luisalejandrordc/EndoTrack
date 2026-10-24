import { http, HttpResponse } from "msw";

export const handlers = [
  // Mock Active User
  http.get("/api/v1/me", () => {
    return HttpResponse.json({
      id: "123e4567-e89b-12d3-a456-426614174000",
      documentType: "DNI",
      documentNumber: "10000001",
      firstName: "Maju",
      lastName: "Admin",
      businessEmail: "maju@admin.com",
      role: "system_admin",
    });
  }),

  // Mock Sales Workspace List
  http.get("/api/v1/sales", () => {
    return HttpResponse.json({
      page: 1,
      pageSize: 20,
      total: 2,
      items: [
        {
          id: "sale-1",
          customerLegalNameSnapshot: "Tech Corp S.A.C.",
          vehicleModelNameSnapshot: "Toyota Hilux",
          vehicleVersionNameSnapshot: "2.8 4x4 SRV",
          vehicleColorNameSnapshot: "Plata Metálico",
          assignedAdvisorId: "adv-1",
          saleTemperature: "hot",
          overallState: "active",
        },
        {
          id: "sale-2",
          customerLegalNameSnapshot: "Juan Pérez",
          vehicleModelNameSnapshot: "Toyota Yaris",
          vehicleVersionNameSnapshot: "1.5 GLi MT",
          vehicleColorNameSnapshot: "Rojo Mica",
          assignedAdvisorId: "adv-1",
          saleTemperature: "warm",
          overallState: "completed",
        },
      ],
    });
  }),

  // Mock Task Engine Data
  http.get("/api/v1/sales/:id/tasks", () => {
    return HttpResponse.json([
      { taskNumber: 1, status: "completed", isEligible: false },
      { taskNumber: 2, status: "completed", isEligible: false },
      { taskNumber: 3, status: "in_progress", isEligible: false },
      { taskNumber: 4, status: "pending", isEligible: false },
    ]);
  }),

  // Mock Login/Logout intercepts to prevent actual network failures
  http.post("/api/v1/auth/employee/login", () => {
    return HttpResponse.json({ accessToken: "mock-jwt-token" });
  }),
  http.post("/api/v1/auth/logout", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
