# EndosoFlow — employee frontend (provisional)

React 18 + TypeScript + Vite, React Router, TanStack Query, React Hook Form + Zod. Spanish UI.
Drop this folder in as `frontend/` of the monorepo.

## Run

```bash
cp .env.example .env
npm install
make run          # in another terminal, from the repo root (API on :8080)
npm run dev       # http://localhost:5173  (Vite proxies /api to the Go API)
```

No backend at hand? Set `VITE_MOCK_ALL=true` in `.env` and restart. Demo accounts (DNI, password `demo-password-1`):
`10000001` admin · `10000002` manager · `10000003` advisor.

## What is real and what is mock

| Area                                                                                                  | Source                                                                          |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Login, refresh, logout, activation, forgot/reset password, `/me`, change password                     | **Real API** (`openapi.yaml`)                                                   |
| Empleados: list, filters, create, edit, deactivate/reactivate, resend activation, delete, `/advisors` | **Real API**                                                                    |
| Ventas, tasks 1–13, documents, notes, history, Clientes, Catálogo, global search                      | **In-memory mock** (`src/mock`) following the State Machines & Permissions Spec |

Everything mock lives behind `src/mock/api.ts` (`salesApi`, `customersApi`, `catalogApi`).
When an endpoint ships, replace that function with a `request(...)` call from `src/shared/api/client.ts`; screens do not change.
Task names, fields and validation rules are in `src/domain/taskDefs.ts` (swap for `GET /reference` later).
Names of tasks 1, 4, 5, 6, 11, 12, 13 are provisional.

## Behaviour worth knowing

- Access token lives in memory only; the refresh cookie restores the session on reload; a 401 refreshes once and retries.
- If the session ends mid-form, a login modal appears over the page so typed data is kept.
- After ~5 s without a response a banner says the server is waking up.
- Mock sales are reseeded per signed-in user (an advisor sees their own three sales).
- Mock file uploads store only name and size; downloads wait for phase 1F.
- Not built yet: profile photo, catalog images, customer detail page, optimistic-lock `version` on mock records.
