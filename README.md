# Endoso MVP — Grupo Pana (demo)

Prototype: employee app + simple customer portal. HTML/CSS/JS + PHP 8 + MySQL.

## Run (XAMPP / Laragon / any PHP+MySQL)

1. Copy the `endoso-mvp` folder to `htdocs` (or `www`).
2. Start Apache and MySQL. Edit `config.php` if your MySQL user/password differ.
3. Open `http://localhost/endoso-mvp/install.php` once (creates DB, tables, demo data). Then delete it.
4. Employees: `http://localhost/endoso-mvp/index.html` — Customers: `.../portal.html`

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
- Customers (B2C/B2B document rules), vehicle catalog (read), sale creation with customer + price snapshots
- 14 tasks with dependencies, confirm before change, due dates (elapsed calendar time), overdue levels 1-3
- Auto-completion of the sale; only manager/admin can reopen a completed task or undo a cancellation
- Cancel with required reason; audit history; dashboard (status, milestones, overdue, workload)
- Customer portal with the 6 macro-milestones

## Not included yet (next iterations)

Task-specific fields and document upload, customer-visible documents, emails, scheduler/reminders,
password change/reset, "remember me", catalog/employee admin screens, exports, CSRF protection.
