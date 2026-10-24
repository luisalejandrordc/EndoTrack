# EndosoFlow — Employee Portal (Phase 1)

Provisional employee-side frontend for the EndosoFlow / Grupo Pana workflow. Built with React 18, Vite, and TypeScript. The UI is Spanish, desktop-first, and responsive for tablet and mobile.

## What is included

- Employee login and forgot-password flow.
- Role-aware workspace for Administrador, Gerencia de ventas, and Asesor de ventas.
- Sales workspace with search, filters, priorities, states, task visibility, and sample metrics.
- Four-step new-sale wizard: customer, vehicle, sale details, review.
- Sale detail with a 6-milestone progress strip and 13 task nodes; tabs for summary, tasks, documents, internal notes, and history.
- Demo task start/complete, sale cancellation/reopening, advisor reassignment, and local note/document changes.
- Customer directory, sample vehicle catalog, employee administration, profile, and password-change form.
- A live API client for endpoints present in the supplied OpenAPI contract: `GET /health` is documented (the UI is prepared for health checks), employee login, refresh, logout, forgot-password, `/me`, `/me/password`, and employee list/create routes.

## Important: current API boundary

The supplied OpenAPI document currently lists System, Authentication, and Staff paths. Sales, tasks, documents, customers, vehicle catalog, search, and reference endpoints appear in the architecture/requirements material but are not present in that OpenAPI file yet. This frontend **does not call invented routes** for those resources. The corresponding screens run against local sample data only while Demo Mode is on; with Demo Mode off, they display a clear integration placeholder. The employee staff list and create form use the documented API in live mode.

Demo changes live in React state and reset after a page reload. They do not touch the Go backend, send activation emails, or upload files to storage. File selection in Demo Mode is presentation-only.

## Quick start (for the presentation)

Requirements: Node.js 20+ and npm.

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. Leave `VITE_DEMO_MODE=true` for the presentation and click **Entrar en modo demostración**. Use the **Vista demo** selector in the top bar to preview the Admin, Gerencia, and Asesor role variants.

## Connect the current Go API

1. Start the Go backend, e.g. at `http://localhost:8080`.
2. In `.env.local`, set:

   ```dotenv
   VITE_DEMO_MODE=false
   VITE_API_BASE_URL=/api/v1
   VITE_API_PROXY_TARGET=http://localhost:8080
   ```

3. Restart Vite. The dev proxy forwards `/api` to the Go service, preserving the `/api/v1` path.
4. Sign in with the employee document type, number, and password already provisioned in the backend.

In live mode the access token stays in memory; the refresh cookie is handled by the browser as HttpOnly. Refresh/logout send `X-Requested-With: EndosoFlow`. The client retries a request once after a successful refresh. The backend must allow the same-origin proxy setup described in the API contract.

If the Go server listens on a different port, update `VITE_API_PROXY_TARGET`. For a deployment where the API is on a different origin, set `VITE_API_BASE_URL` to the appropriate API base and configure CORS/cookies to match the backend's security contract; same-origin proxying is the expected setup.

## Validation

```bash
npm run typecheck
npm run build
```

## Project structure

```text
src/
  components/    icon primitive, modal
  data/          presentation data and 13 task definitions
  lib/api.ts     typed API client / error envelope
  App.tsx        authentication, shell, page flows
  styles.css     design system and responsive layouts
  types.ts       domain-facing frontend types
```

## Backend integration checklist

- [x] `POST /auth/employee/login`, `/auth/refresh`, `/auth/logout`
- [x] `POST /auth/forgot-password`
- [x] `GET /me` client method; session profile is also returned by login/refresh
- [x] `PUT /me/password`
- [x] `GET /employees` and `POST /employees`
- [ ] Wire sales/customer/catalog/task/document/history data once their routes are added to `api/openapi.yaml`
- [ ] Replace sample task names and milestone labels with `/reference` response values
- [ ] Replace demo image URLs with current catalog image URLs / signed storage URLs
- [ ] Add upload and optimistic-lock handling when the task/document endpoints are available
