# EndosoFlow — Employee Information Architecture & User Journeys

## 1. Purpose, scope and principles

This document defines how the employee application is organized and how people move through it. It covers Phase 1 only (the employee side); the customer portal gets its own version in Phase 2. It builds on the State Machines & Permissions Spec and the Phase 1 Requirements Catalog. The interface is entirely in Spanish; Spanish labels are shown in italics. No visual design (colors, typography, layouts in pixels) is decided here.

Design principles:

1. **Sale-centric.** Most daily work happens inside one sale, so the sales workspace and the sale detail are home.
2. **One clear next action.** The current task is always highlighted with the next action allowed to the user.
3. **Role-adaptive, not role-separated.** Everyone uses the same screens. Controls appear only when allowed, and a disabled control explains why in one sentence.
4. **Confirm and explain.** Every status transition and destructive action asks for confirmation; reasons are captured in a modal; errors name the rule that was broken.
5. **Desktop-first, tablet-friendly.** Phones can read and make simple updates.
6. **Honest about the platform.** The free hosting may need a few seconds to wake up, and the interface says so instead of looking broken.

## 2. Navigation map

| Section                                             | Spanish label   | Admin     | Manager                       | Advisor       | Phase |
| --------------------------------------------------- | --------------- | --------- | ----------------------------- | ------------- | ----- |
| Sales workspace (home)                              | _Ventas_        | All sales | All sales                     | Own sales     | 1     |
| New sale (button in Ventas and header)              | _Nueva venta_   | Yes       | Yes                           | Yes           | 1     |
| Customers                                           | _Clientes_      | All       | All                           | In scope only | 1     |
| Vehicle catalog                                     | _Catálogo_      | Edit      | Edit                          | Browse        | 1     |
| Staff                                               | _Empleados_     | Full      | Picker only (active Advisors) | No            | 1     |
| My profile (name, photo, change password, sign out) | _Mi perfil_     | Yes       | Yes                           | Yes           | 1     |
| Analytics                                           | _Analítica_     | Global    | Global business               | Own           | 3     |
| Exports                                             | _Exportaciones_ | Full      | Limited                       | No            | 3     |
| Audit and access logs                               | _Registros_     | Yes       | No                            | No            | 3     |

Everyone lands on _Ventas_ after login. Record history timelines live inside each record in Phase 1; the global _Registros_ viewers arrive in Phase 3. A global search box in the header looks up sales and customers within the user’s scope.

## 3. Screen inventory

| Screen                                            | Purpose and key elements                                                                                                                                                                         | Roles               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| _Iniciar sesión_                                  | Document type, number, password, ‘Mantener sesión iniciada’, link to forgot password; one generic error message                                                                                  | Public              |
| _Definir contraseña_                              | Opened from the activation link; sets the first password; shows the password rules                                                                                                               | Public (token)      |
| _Olvidé mi contraseña_ / _Restablecer contraseña_ | Identifier form with a neutral confirmation; reset form from the emailed link                                                                                                                    | Public              |
| Session expired, no access, not found             | Friendly pages; ‘not found’ is shown for out-of-scope records so existence never leaks                                                                                                           | All                 |
| _Ventas_                                          | Search, filters (state, current task, milestone, advisor, customer type, temperature, vehicle), sort, pagination; each row shows customer, vehicle, advisor, temperature, state and current task | All staff           |
| _Nueva venta_                                     | Four-step wizard: 1 Customer, 2 Vehicle, 3 Sale data, 4 Review                                                                                                                                   | All staff           |
| Sale detail                                       | Header, progress strip and tabs _Resumen_, _Tareas_, _Documentos_, _Notas_, _Historial_                                                                                                          | Per scope           |
| Modals                                            | Confirm start, confirm complete, reason, cancel sale, reopen sale, reassign advisor, permanent delete                                                                                            | Per rules           |
| _Clientes_ (list, detail, new and edit)           | Search by name or document, type and active filters, customer data, linked sales, Codart autofill with manual fallback                                                                           | Per scope           |
| _Catálogo_ (models list)                          | Models with category, status and image; archive toggle                                                                                                                                           | All staff           |
| Model detail                                      | Versions, colors and an image grid per color with the six viewpoints                                                                                                                             | Admin, Manager edit |
| _Nuevo modelo_                                    | Wizard: model, first version, first color with its Main view image (all three are required)                                                                                                      | Admin, Manager      |
| _Empleados_ (list, detail, new)                   | Staff data, role, status, activation resend, deactivate with the active-sales check                                                                                                              | Admin               |
| _Mi perfil_                                       | Own data, photo, password change, sign out                                                                                                                                                       | All staff           |

## 4. Sale detail layout

**Header.** Customer legal name and document, vehicle (model, version, color and its Main image), assigned advisor, temperature badge, sale state badge and the current task. An actions menu shows only what the user may do: _Reasignar_, _Cancelar_, _Reabrir_ (when cancelled) and, exceptionally for Admins, _Eliminar_.

**Progress strip.** Six milestones containing 13 numbered task nodes. Node states: pending, eligible (ready to start), in progress, completed. A cancelled sale is greyed out with a banner showing the reason category; a completed sale shows a success banner.

**Tabs.**

- _Tareas_: the 13 tasks as an accordion with the current task expanded. Each row shows status and dates; the actions follow section 5.
- _Documentos_: every document slot grouped by task, with status (missing or uploaded), upload, replace, remove while the task is in progress, and download, plus a badge: Visible para el cliente or Interno.
- _Notas_: sale notes and task notes, internal only.
- _Historial_: filterable timeline of audit events within the user’s visibility.

## 5. Task panel behavior

| Task situation                | What the user sees and can do                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pending, not yet eligible     | Read-only fields and the message ‘Primero debe completarse la tarea N‑1’. No actions.                                                                                                      |
| Pending, eligible             | Read-only fields and the button _Iniciar tarea_ (with confirmation) for Admin, Manager and the assigned Advisor.                                                                           |
| In progress                   | Editable fields and uploads, _Completar tarea_ (with confirmation). Manager and Admin also get _Reiniciar tarea_ (reason). Completion errors list every missing field or document by name. |
| Completed, the latest         | Read-only for Advisors. Manager and Admin get _Editar_ (Reason for Edit) and _Reabrir tarea_ (reason).                                                                                     |
| Completed, not the latest     | Manager and Admin can edit with a reason. _Reabrir_ is disabled with ‘Reabra primero la tarea N+1’ (or restart the task in progress).                                                      |
| Restarted and back to pending | Fields keep their data, read-only, with the notice ‘Datos conservados’.                                                                                                                    |
| Sale cancelled or completed   | Everything is read-only under a banner; the only allowed actions are the sale-level ones (reopen, or reopen Task 13).                                                                      |

Field-level behavior:

- **Locked financial fields** show a lock icon and the tooltip ‘Bloqueado: hay tareas posteriores completadas’, with the rollback path.
- **Amount mismatch** (Tasks 4, 5, 6): the expected amount and the entered amount appear side by side, and the Mismatch Reason field becomes required.
- **Date warnings** (out-of-order dates) are yellow and never block; impossible values are red and do block.
- **Uploads** show the allowed format and size (10 MB) before the user picks a file, and a clear error afterwards.

## 6. User journeys

### J1. Employee activation and first login

**Actor:** new employee. **Preconditions:** an Admin created the account.

1. The employee opens the activation link from the business email.
2. _Definir contraseña_ shows the rules (10 characters minimum) and a strength hint.
3. After saving, they are sent to _Iniciar sesión_ and log in with document type, number and password.
4. They land on _Ventas_ (empty state for a new advisor: ‘Aún no tiene ventas asignadas’ with a _Nueva venta_ button).

**Alternate paths:** expired or reused link shows a message and tells them to ask an Admin for a new one. Five failed logins lock the account for 15 minutes with the same generic error.

### J2. Advisor registers a customer and creates a sale

**Actor:** Sales Advisor. **Goal:** open a new sale.

1. _Nueva venta_, step 1 _Cliente_: type the document type and number.
2. If the customer exists and is not linked to the advisor, the screen shows only the legal name with ‘Usar este cliente’. If the customer is new, the advisor fills the form; for a DNI or RUC the name is looked up automatically and marked ‘consultado’. If the lookup fails or the monthly quota is used up, the fields unlock for manual entry marked ‘ingresado manualmente’.
3. Step 2 _Vehículo_: pick a model, then a version (reference price shown), then a color (Main image shown). Archived entries do not appear.
4. Step 3 _Datos de la venta_: temperature (with the hint for Hot, Warm, Cold) and optional notes. The advisor is assigned automatically; Managers and Admins see an advisor picker here.
5. Step 4 _Revisión_: summary and a confirmation. Saving creates the sale and its 13 tasks at once.
6. The user lands on the sale detail with Task 1 eligible and the _Iniciar tarea_ button visible.

**Error paths:** an inactive customer cannot be chosen; a duplicate customer document returns a clear message; if saving fails nothing is created.

### J3. Advisor completes the current task (example: Task 4)

**Actor:** assigned Advisor. **Preconditions:** Task 3 completed, Task 4 eligible.

1. In _Tareas_ the advisor presses _Iniciar tarea_ and confirms.
2. The panel becomes editable. They choose the bank, enter the date, transaction number and deposited amount, and upload the voucher PDF.
3. The deposited amount differs from the quoted price. The expected and entered amounts appear side by side and the Mismatch Reason becomes mandatory; they write it.
4. They press _Completar tarea_ and confirm. Task 4 becomes completed, Task 5 becomes eligible and the progress strip updates.

**Error paths:** a transaction number already used for that bank shows an inline error; a file over 10 MB or not a PDF is refused; if someone else changed the task meanwhile, the app says ‘Otro usuario modificó este registro; recargue para ver los cambios’ and keeps the user’s typing visible.

### J4. Manager reassigns a sale

**Actor:** Manager or Admin.

1. In the sale header the actions menu opens _Reasignar_.
2. A picker lists active Sales Advisors by name. The manager selects one and may add a note.
3. After confirming, the old advisor loses access immediately and the new one finds the sale in _Ventas_.

**Rules shown to the user:** only active sales can be reassigned; the action is missing for cancelled and completed sales.

### J5. Cancelling and reopening a sale

**Actors:** Advisor, Manager, Admin.

1. _Cancelar_ opens a modal with a mandatory reason category and a text field.
2. Advisors can confirm only while the current task is 1 to 3. For later stages the button is disabled with ‘Solicite la cancelación a un Gerente’. Managers can cancel up to Task 6 and Admins at any stage.
3. The sale is cancelled, tasks freeze, and the banner shows the category. The customer will later see only _Cancelada_, without the reason.
4. To reopen, a Manager or Admin opens _Reabrir_, types the reason and confirms. A sale cancelled after Task 6 shows _Reabrir_ to Admins only.
5. If the series, VIN or plate now collides with another active or completed sale, the reopening is refused and names the conflicting value.

### J6. Manager corrects an earlier task (financial source field)

**Scenario:** the accessory amount in Task 1 is wrong, Tasks 2 and 3 are completed and Task 4 is in progress.

1. The manager opens Task 1 and tries _Editar_; the amount fields are locked and the tooltip explains the rollback.
2. They restart Task 4 (reason), then reopen Task 3 and Task 2 in reverse order (reason each time). Task 2 is now in progress and no later task is completed.
3. Task 1’s amount is editable again; they edit it with a Reason for Edit.
4. They complete Task 2 and Task 3 again, in order (the final commission is recalculated and must stay positive), and then start Task 4 again, which receives a new due date. Reopened tasks keep their original due dates.

The lock applies from the moment any later task is completed, so a correction is always a linear rollback.

### J7. Admin onboards and deactivates staff

1. _Empleados_, _Nuevo empleado_: fill in the data and role. The system sends the activation email to the business address.
2. To deactivate an advisor, the Admin opens the employee and presses _Desactivar_. If the advisor has active sales, the action is blocked and the screen lists those sales with a shortcut to reassign each one.
3. The last active Admin cannot be deactivated or demoted; the screen explains why.

### J8. Manager creates a catalog model

1. _Catálogo_, _Nuevo modelo_: name, description and one or more categories.
2. The next step requires a first version (name and reference price), then a first color with its Main view image. Without all three the model cannot be saved.
3. After saving, the model page lets the manager add versions, colors and the five optional viewpoints.
4. Archiving the last active version or color of an active model is blocked with ‘Archive el modelo en su lugar’. Archiving the model hides all its versions and colors from new sales.

### J9. Forgot password and lockout

1. _Olvidé mi contraseña_: the user enters document type and number and always sees the same confirmation message.
2. If the account exists, a reset link (valid 1 hour) arrives at the business email. Resetting signs the user out everywhere.
3. A locked account shows the same generic login error; the lock clears after 15 minutes.

## 7. Cross-cutting interface behavior

- **Confirmation dialogs** state the action, the object and the consequence, for example ‘Va a completar la tarea 4. Esta acción habilita la tarea 5.’
- **Reason modal:** a required text field (and a category for cancellations), validated on the server as well.
- **Cancellation categories:** _Cliente desistió_, _Pago o financiamiento no concretado_, _Unidad no disponible_, _Observación en debida diligencia_, _Error de registro_, _Otro_ (the text becomes mandatory).
- **Errors:** validation messages in Spanish name the rule; a forbidden record looks like ‘no encontrado’ for Advisors.
- **Loading:** skeleton screens; after about 5 seconds without a response a banner says ‘El servidor se está iniciando, esto puede tardar unos segundos’.
- **Session:** the access token renews silently. If the session ends while a form is open, a login modal keeps the typed data and resumes after login.
- **Unsaved changes** trigger a warning before leaving a form.
- **Lists:** default page size 20 with remembered filters during the session.
- **Phase 3 placeholders:** SLA badges, urgency filters and the dashboards stay hidden until Phase 3.
- **Accessibility:** keyboard-operable dialogs, visible focus, labelled fields and non-color status cues.
