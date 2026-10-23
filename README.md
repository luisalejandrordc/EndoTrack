# EndosoFlow — Grupo Pana

Platform for tracking vehicle sales sold through the Grupo Pana _endoso_ channel.
This is the 1D foundation. Slice 1 is **the database** (migrations plus a SQL rule-check script).
Slice 2 is the **Go backend foundation** (configuration, logging, database access, error mapping and the
health endpoint). CI and employee authentication come next.

## Local setup on macOS

1. Install PostgreSQL and goose with Homebrew. Use the same major version as your Supabase project. The example uses 18:

   ```
   brew install postgresql@18 goose
   brew services start postgresql@18
   echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

   (On Intel Macs the Homebrew prefix is `/usr/local` instead of `/opt/homebrew`.)

2. From the repository root:

   ```
   make db-create      # creates endosoflow_dev and endosoflow_test
   make migrate-up     # applies all migrations to the dev database
   make db-verify      # rebuilds the test database and runs ~70 rule checks
   ```

   `make db-verify` ends with `ALL CHECKS PASSED`. Every rule from the Data Model (unique indexes,
   partial indexes, CHECKs, generated columns, the six triggers) has at least one check.

## Go backend (slice 2)

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
- Employee authentication, the business modules, the frontend and CI.
