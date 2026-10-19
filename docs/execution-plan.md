# Execution Plan

### Phase 0 — Discovery and platform validation

The goal is to answer the open questions, define the tech stack, resolve possible edge-cases, build the glossary and decision log, and write specs for the task, sale and milestone state machines, the SLA rules and the notification rules. It also produces the role x action permission matrix and the MVP / V1 / future split.

### Phase 1 — Employee side and core logic

| Sub-phase                           | Scope                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1A Requirements & UX foundation** | Reconciled rules, state machines, permissions spec, Phase 1 FR/NFR catalog, information architecture and user journeys for employee screens                                                                                                                                                                                  |
| **1B Data modeling**                | Final relational model, ERD, constraints and indexes, audit and snapshot design, task-definition reference data, schema-level invariants, rules checks                                                                                                                                                                       |
| **1C Architecture & API contract**  | Module boundaries, layering, error format, pagination and filtering, RBAC design, concurrency and idempotency, tooling, project structure, Phase 1 API spec                                                                                                                                                                  |
| **1D Foundation & auth**            | Repo, CI, environments and secrets, migrations, employee auth (hashing, JWT, refresh rotation and reuse detection, cookies and CSRF), access logs, password recovery with a minimal email service, RBAC middleware, rate limiting, audit writer, bootstrap admin. Auth and authorization tests; deployed with an empty shell |
| **1E Reference data**               | Employees, customers, Codart lookup and manual fallback, vehicle catalog with R2 images, provenance fields, CRUD per role matrix, with authorization tests                                                                                                                                                                   |
| **1F Documents**                    | Private R2 storage, upload validation, metadata, replace and remove, signed URLs after authorization, visibility metadata                                                                                                                                                                                                    |
| **1G Workflow engine**              | Sale creation (snapshots and 13 tasks in one transaction), task transitions, per-task typed validation, identifier uniqueness, auto-complete, cancel and reopen, reassignment, derived milestone view, audit events. Exhaustive valid and invalid transition tests; concurrency tests                                        |
| **1H Employee frontend**            | Shell, login, workspace with search, filter, sort and pagination, sale detail with timeline, task forms, admin screens, in Spanish with accessibility, E2E tests of critical journeys                                                                                                                                        |
| **1I Hardening & exit**             | History views, demo data, role regression suite, performance check against agreed targets, stakeholder demo                                                                                                                                                                                                                  |

### Phase 2 — Customer side

| Sub-phase                        | Scope                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2A Customer auth & isolation** | Separate login, first-login activation, set-password, forgot-password, separate cookie scope, customer-scoped authorization layer, ID-guessing and cross-customer tests should fail safely |
| **2B Visibility projection**     | Server-side allowlist of customer-visible fields and documents per task, milestone API, advisor contact                                                                                    |
| **2C Portal frontend**           | Sale list, six-milestone timeline, documents, avatars, onboarding, empty and error states, E2E tests                                                                                       |
| **2D Email notifications**       | Spanish templates, idempotency keys, claim-send-retry flow in `notification_logs`, failure handling, rollback and recompletion send no duplicates                                          |
| **2E Hardening & pilot**         | Security review, pilot with a few customers                                                                                                                                                |

### Phase 3 — Scheduler and automation

| Sub-phase                   | Scope                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3A SLA engine**           | Due dates, reminder state and `completion_phase`. Boundary, pause and cap tests                                                                                   |
| **3B Scheduler endpoints**  | `process-reminders` and `cleanup-tokens` (both tables) with secret auth, rate limiting, overlap protection and fast response, overlapping runs send no duplicates |
| **3C Escalation & UI**      | Level 1–3 emails, Approaching/Overdue/Escalated indicators, urgent filters                                                                                        |
| **3D BI dashboard**         | KPI definitions first (numerator, denominator, period, inclusions), SQL views, Recharts, role-scoped                                                              |
| **3E Exports & logs**       | Role-gated exports, audit and access-log viewers, export auditing, CSV formula-injection protection, authorization tests                                          |
| **3F Production readiness** | Monitoring, runbook, security review, go-live checklist                                                                                                           |
