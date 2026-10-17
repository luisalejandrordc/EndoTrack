# Endoso MVP — Grupo Pana (demo)

Prototype: employee app + simple customer portal. HTML/CSS/JS + PHP 8 + MySQL.

## Run (XAMPP / Laragon / any PHP+MySQL)

1. Copy the `endoso-mvp` folder to `htdocs` (or `www`).
2. Start Apache and MySQL.
3. Copy `.env.example` to `.env` and set your MySQL user/password (`.env` is git-ignored, so credentials never reach GitHub).
4. Open `http://localhost/endoso-mvp/install.php` once (creates DB, tables, demo data). Then delete it.
5. Employees: `http://localhost/endoso-mvp/index.html` — Customers: `.../portal.html`

## Demo logins (doc type / number / password)

| Role          | Login                                                              |
| ------------- | ------------------------------------------------------------------ |
| System Admin  | DNI 00000001 / admin123                                            |
| Sales Manager | DNI 00000002 / gerente123                                          |
| Sales Advisor | DNI 00000003 / asesor123 (María), DNI 00000004 / asesor123 (Jorge) |
| Customer      | CE 001234567 / cliente123 · RUC 20123456789 / cliente123           |

## Included

- Login by document type + number (hashed passwords, lockout after 5 failures, access log)
- RBAC enforced in the API (advisor sees only own sales; manager/admin see all)
- Customers, vehicle catalog (read), sales with customer + price snapshots
- 14 tasks with dependencies, confirmations, due dates, overdue levels 1-3, auto-completion
- Cancel with reason, audit history, dashboard, customer portal with 6 milestones

## Not included yet

Task fields and document upload, emails, scheduler/reminders, password change/reset,
"remember me", catalog/employee admin screens, exports, CSRF protection.

## Security notes

- Credentials live only in `.env` (ignored by git). Commit `.env.example`, never `.env`.
- `.htaccess` blocks web access to `.env`; better still, put `.env` one folder above the web root (config.php checks there first).
- Demo passwords in `install.php` are demo-only; delete `install.php` after setup and change them before any real use.
