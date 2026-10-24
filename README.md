# EndosoFlow — Grupo Pana

Web platform for managing and tracking Grupo Pana's vehicle endoso process, featuring employee
and customer portals, task-based workflows, and secure document access.

## Local setup on macOS

Install PostgreSQL and goose with Homebrew. Use the same major version as your Supabase project. The example uses 18:

```
brew install postgresql@18 goose
brew services start postgresql@18
echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

(On Intel Macs the Homebrew prefix is `/usr/local` instead of `/opt/homebrew`.)

From the repository root:

```
make db-create      # creates endosoflow_dev and endosoflow_test
make migrate-up     # applies all migrations to the dev database
make db-verify      # rebuilds the test database and runs ~70 rule checks
```

`make db-verify` ends with `ALL CHECKS PASSED`. Every rule from the Data Model (unique indexes,
partial indexes, CHECKs, generated columns, the six triggers) has at least one check.

## Go backend

```
brew install go
cp backend/.env.example backend/.env
make tidy      # downloads dependencies and creates go.sum (needs internet)
make vet       # static checks
make test      # unit tests; the database tests run against endosoflow_test (run make db-verify first)
make run       # starts the API
curl http://localhost:8080/api/v1/health
```

The health call should answer `{"status":"ok","database":"ok"}`.

New settings in `backend/.env`: `JWT_SECRET` (at least 32 characters) and `APP_BASE_URL` (the frontend address
used in emailed links).

Run `make fmt` before committing: CI checks formatting, and it will fail if the Go files are not formatted.

## Authentication

The API now serves the employee authentication routes under `/api/v1`:
`POST /auth/employee/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/activate`,
`POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /me` and `PUT /me/password`.

Create the first System Admin once (it refuses to run if one already exists):

```
make bootstrap-admin ARGS="-doc-number 10000001 -first-name Maju -last-name Admin -gender F \
  -phone 999111222 -email maju@admin.com -birthdate 2004-10-05 -hire-date 2026-01-01"
```

It prints an activation link. Locally no real email is sent: emails are written to the server log, so you
can also copy the link from there. The frontend will need two pages that match the links:
`/activar-cuenta?token=...` and `/restablecer-contrasena?token=...`.

Try the login with curl after activating (the account is created by the command above):

```
curl -i -X POST http://localhost:8080/api/v1/auth/employee/login \
  -H 'Content-Type: application/json' \
  -d '{"documentType":"DNI","documentNumber":"10000001","password":"YOUR-PASSWORD","rememberMe":false}'
```

## Staff module and the API contract

New routes (Admin unless noted): `GET/POST /employees`, `GET/PATCH/DELETE /employees/{id}`,
`POST /employees/{id}/deactivate`, `/reactivate`, `/resend-activation`, and `GET /advisors` (Admin and Manager).
Deleting takes the reason as a query parameter: `DELETE /employees/{id}?reason=Creado%20por%20error`.

The contract lives in `backend/api/openapi.yaml`. A Go test (`make test`) fails when the code serves a route
the contract does not describe, or the contract describes a route the code does not serve. To read the contract
as a web page, paste the file into https://editor.swagger.io or run
`npx @redocly/cli preview-docs backend/api/openapi.yaml`. The frontend will generate its TypeScript types from
this file (`npx openapi-typescript backend/api/openapi.yaml -o frontend/src/shared/api/schema.d.ts`).

Run `make tidy` again after pulling this slice: it adds one dependency for the contract test.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request. GitHub starts a temporary
PostgreSQL for it (you write no Docker code), applies the migrations, runs the SQL rule checks, then the
format check, `go vet` and `go test`. Commit `backend/go.sum` (created by `make tidy`) so the workflow can
cache dependencies.

## What the migrations contain

| File   | Content                                                                                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `0001` | Extensions (`pg_trgm`, `unaccent`), search helper functions, all enums                                                            |
| `0002` | `milestone_definitions`, `task_definitions`, `document_slots` (rows come from a later seed migration)                             |
| `0003` | `employees` (with the system actor row) and `customers`                                                                           |
| `0004` | Vehicle catalog: models, categories, versions, colors, images                                                                     |
| `0005` | Refresh tokens (employee and customer), `account_tokens`, `access_logs`                                                           |
| `0006` | `sale_registers`, `task_instances`, `sale_financials`, `sale_due_diligence`, `sale_payments`, `sale_invoices`, `sale_fulfillment` |
| `0007` | `documents` and `storage_deletions`                                                                                               |
| `0008` | `audit_logs`, `notification_logs`, `lookup_logs`                                                                                  |
| `0009` | Views: current task, milestones, SLA state, selectable versions and colors                                                        |
| `0010` | The six triggers (custom SQLSTATE codes EF001 to EF006); the Main view rule covers every color                                    |
| `0011` | Row-level security enabled on every table                                                                                         |
| `0012` | Seed data: 6 milestones, 13 tasks and 19 document slots with the approved Spanish texts                                           |

Migrations are forward-only: fix mistakes with a new file, never by editing an applied one.

## Not included yet

- Database roles for production (`migrator` and `app_backend`) and the controlled sale-deletion function.
