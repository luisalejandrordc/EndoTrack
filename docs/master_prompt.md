# Grupo Pana — Endoso Operations & Customer Tracking Platform

## Purpose of this prompt

Help me design and plan a substantial, production-oriented web platform for managing Grupo Pana's vehicle sales through the **endoso** sales channel. Treat this document as the project's current source of truth. It includes business rules, workflow details, security expectations, a preferred technology stack, and an initial database proposal. Some implementation details may still need validation; distinguish confirmed decisions from recommendations and unresolved questions.

The product has two connected experiences:

1. **Employee application:** manage customers, employees, the vehicle catalog, sale registers, the 13-task operational process, documents, assignments, reminders, audit history, and operational analytics.
2. **Customer portal:** allow customers to securely view their own sale registers, follow six customer-facing milestones, contact their assigned sales advisor, and access only the information/documents explicitly approved for customer visibility.

The company currently has a basic internal application in Power Apps and a Power BI dashboard, but I will not provide their screenshots or detailed documentation. Treat that only as background context. **Design the product described here; do not attempt to recreate another tool.**

Do not start by writing application code. First establish the business/domain model and the baseline project documentation requested in the final section. Then guide me iteratively through requirements, data modeling, UX, architecture, API, implementation, testing, and deployment.

---

## 1. Your role and collaboration rules

Act as a collaborative senior partner across product discovery, business analysis, UX/UI design, software architecture, database design, backend/API design, security, analytics, testing, and project planning. Explain your reasoning clearly, including technical trade-offs, so I can learn from the process.

Throughout our work, label information as one of the following when relevant:

- **Confirmed requirement/decision:** explicitly stated in this prompt.
- **Proposal:** an idea to evaluate, not automatically implement.
- **Assumption:** temporary and made explicit so work can proceed.
- **Open question:** a business or technical decision that still needs resolution.
- **Recommendation:** your reasoned advice, separate from the requirements.
- **Future enhancement:** potentially useful, but not necessarily part of the MVP/V1.

Do not invent missing business rules, quietly change stated requirements, or silently turn assumptions into facts. If you find inconsistencies, security concerns, unsupported assumptions, or unnecessarily complex approaches, explain the issue, its effect, and a recommended resolution. Where a conflict cannot be resolved confidently from this prompt, preserve the original intent and mark the exact decision that needs confirmation.

Keep these layers consistent:

**business process → business rules → requirements → UX → permissions → data model → API → architecture → implementation → tests.**

Work iteratively rather than treating the first output as an unchangeable final design. When new information arrives, update the affected artifacts and decision log.

During implementation, use clean code, SOLID principles where appropriate, modular design, secure defaults, and sound engineering practices. Before generating individual source files, show the complete proposed project structure and explain each major directory/module. Avoid premature abstraction and do not apply design patterns merely for their own sake.

---

## 2. Business context, problem, objectives, and scope

### 2.1 Business context

Grupo Pana is a Peruvian automotive company and an official Toyota and Hino dealership. Among its vehicle sales channels is **endoso**, a process that involves commercial, administrative, financial, documentation, customs, registration, preparation, and vehicle-delivery activities.

A sale operation must be tracked from the official quotation through final vehicle delivery. The process involves coordination among the customer and Grupo Pana employees, and relies on accurate task data, supporting documents, and clear responsibility.

### 2.2 Product intent

The platform should centralize operation information, improve the employee workflow, make task progress and delays easier to understand, provide management with actionable analytics, preserve important history, and give customers a secure and understandable view of their own purchase.

Potential problem areas include operational coordination, traceability, delays, bottlenecks, document management, customer uncertainty, data quality, and management reporting. Validate and refine these as part of the analysis rather than treating every possible problem as already proven.

### 2.3 Desired outcomes

Help define measurable objectives and success metrics. Candidate outcomes include:

- Centralize sale-operation information and documents.
- Improve visibility into task status, the current task, strict process order, and delays.
- Give customers a clear, secure way to follow their purchase.
- Improve accountability and auditability.
- Identify tasks and operations needing attention.
- Improve operational and management reporting.
- Reduce avoidable communication and coordination effort.
- Protect customer, employee, financial, and legal information.

For each proposed metric, explain its calculation and the baseline data needed to evaluate improvement. Do not claim that an outcome has improved before data exists to support that conclusion.

### 2.4 Scope discipline

Help distinguish:

- **MVP:** the smallest end-to-end solution that is genuinely useful.
- **V1:** the first complete, production-oriented release.
- **Future enhancements:** ideas that can wait without undermining the core process.
- **Out of scope:** features intentionally excluded from the current plan.

Prevent scope creep and identify dependencies between features.

---

## 3. Product capabilities and user types

### 3.1 Employee application

Authorized employees need to:

- Create and manage customer accounts and customer records.
- Manage employee accounts and roles according to permissions.
- Manage vehicle models, versions, colors, and images.
- Create and manage sale registers, each representing exactly one vehicle sale.
- Assign a Sales Advisor to each sale.
- Track the sale through a strict, linear sequence of 13 tasks.
- Enter task-specific fields and upload required documents.
- Add notes to tasks and sale registers.
- Cancel or reopen sales when permitted.
- Search, filter, sort, and paginate operations and reference data.
- Monitor deadlines, reminders, and escalations.
- View operational and management analytics through an integrated BI dashboard.
- Review appropriate record history, audit logs, and exports according to role.

These capabilities are governed by the role-permission matrix in this prompt. Do not assume every employee can perform every action.

### 3.2 Customer portal

Customers need to:

- Sign in through a customer-specific login interface.
- View all sale registers associated with their customer record.
- View vehicle details and their assigned Sales Advisor's approved contact information.
- Follow progress through six customer-facing macro-milestones.
- Access only the fields and documents explicitly designated as customer-visible.
- Receive account and milestone notifications.
- Reset their password.

A customer must never be able to access another customer's sales, documents, or private information, even by guessing record IDs or URLs.

### 3.3 Employee roles

The employee roles are:

- `System Admin`
- `Sales Manager`
- `Sales Advisor`

Customers are a separate access class, not an employee RBAC role.

#### Initial role-permission matrix

| Module / feature      | System Admin                                                                                                 | Sales Manager                                                                                      | Sales Advisor                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Staff user management | Full CRUD; create staff, assign roles, reset passwords, and permanently delete only when genuinely necessary | View active staff, limited to Sales Advisors, for reassignment purposes                            | No access                                                                                                                     |
| Vehicle catalog       | Full CRUD                                                                                                    | Create/edit models and versions, upload photos, archive old catalog entries                        | Read-only; browse/select vehicles for a sale                                                                                  |
| Customer database     | Full CRUD, including exceptional permanent deletion                                                          | View/edit/create any customer; no hard delete                                                      | Create customers; edit/view only customers associated with their assigned sales, subject to the existing-customer rules below |
| Sale registers        | Full CRUD; permanently delete corrupted/test records only under controlled conditions                        | View all, reassign advisors, cancel any sale, undo cancellations                                   | Create/update/cancel own assigned sales; cancellation requires a reason; cannot undo cancellation                             |
| Tasks and documents   | Full access for exceptional administrative/technical intervention                                            | Override tasks across sales, including editing/replacing documents and reopening completed tasks   | Update own active tasks; completed tasks are read-only                                                                        |
| BI dashboard          | Global operational/system view                                                                               | Global business and operational view                                                               | Individual view of own permitted pipeline/performance metrics                                                                 |
| Raw data exports      | Full-system exports where necessary, including audit/access logs                                             | Business exports of global customer lists, sales registers, task audit logs, and cancellation logs | No raw CSV/Excel exports                                                                                                      |

Apply least privilege. Enforce every permission on the backend/API, not only in the frontend. Separate viewing, editing, cancelling, reopening, exporting, and deleting permissions. Log security-sensitive operations and exceptional destructive actions.

Advisor-specific rules:

- A Sales Advisor's sale access is limited to their assigned sales. If reassignment occurs, revoke the previous advisor's sale access and provision access to the new advisor immediately after the reassignment is committed.
- An advisor may retain access to a customer profile as long as the advisor has at least one assigned sale for that customer.
- If an advisor creates a sale for a customer who already exists, allow linking the sale to that customer without revealing the customer's other sales or unrelated history.
- Access to "own sales" is dictated exclusively by the current `assigned_advisor_id`. If a sale is reassigned, the original creator immediately loses access. The permission matrix must never grant implicit visibility based on the `created_by` field.

Use safeguards for System Admin's powerful permissions. Prefer archive/soft deletion for ordinary business records. Permanent deletion should be exceptional, confirmed, and auditable.

---

## 4. Core domain rules and sale lifecycle

### 4.1 One sale register per vehicle

Each sale register represents **exactly one vehicle sale**. If a customer purchases two vehicles, create two independent sale registers. Each register has its own vehicle selection, 13-task progress, documents, timeline, notes, sale state, and assigned advisor.

### 4.2 Information represented by a sale register

The logical sale record must include:

- Reference to the customer record.
- Immutable creation-time snapshot of the customer's legal/name value, document type, and document number.
- References to the selected vehicle model, version, and color.
- Text snapshots of model/version/color names and snapshot of the selected version's reference price at the time the sale is created.
- Thirteen task instances and task-specific fields/documents.
- Progress, timeline, and the current/next eligible task derived from the task statuses and fixed order.
- Sale temperature: `Hot`, `Warm`, or `Cold`, representing estimated probability of completion **at creation time**. It is immutable after creation to preserve baseline conversion analytics.
- `created_at` timestamp.
- `created_by`, the employee who created the sale.
- `updated_at` and `updated_by`, where applicable.
- Overall sale state: `active`, `completed`, or `cancelled`.
- Sale-level notes, which are internal and never customer-visible.
- `assigned_advisor_id`, separate from `created_by`.

These are domain requirements, not a command to create one database table per bullet. Choose and justify a relational design.

### 4.3 Sale state

- A sale automatically becomes `completed` when all 13 tasks are completed.
- A Sales Advisor may cancel their own assigned sale and must provide a reason. They cannot undo the cancellation.
- A Sales Manager may cancel any sale and undo cancellations.
- Cancelled sales remain in the system for historical/audit purposes and are not physically deleted during ordinary operation.
- A System Admin may permanently delete corrupted/test sales only under controlled, auditable conditions.
- When a sale is cancelled, active SLA calculations/reminders for its tasks must stop immediately.
- If a Manager or Admin reverts Task 13 from `completed`, the overall sale state must transactionally return from `completed` to `active`, and the action must generate a mandatory audit event.
- When reopening a cancelled sale, the backend must check whether its physical identifiers (series, VIN, and license plate) have been assigned to another `active` or `completed` sale. If a conflict exists, block reopening and explain the conflict. Identifiers from cancelled sales are intended to become available for reuse. The check is only an early validation for user experience. The actual state transition must be protected by the partial unique indexes on `Sale_Registers`.

### 4.4 Historical integrity and snapshots

Customer profiles and vehicle catalog entries can change. Historical sale data must not be retroactively changed by customer edits, catalog renames, or reference-price updates.

At sale creation, preserve the customer's legal/name value, document type, document number, selected model/version/color names, and reference price. Treat these historical snapshots as immutable except through a deliberately authorized, audited correction process if the business later approves one. The quote amounts and task data have their own lifecycle and must not be confused with the catalog's reference-price snapshot.

### 4.5 Record provenance

For customer, employee, sale, vehicle model, vehicle version, vehicle color, and catalog image records, track applicable provenance fields:

- `created_at`
- `created_by`
- `updated_at`
- `updated_by`
- Archive/deactivation metadata where relevant

For bootstrap, system-seeded, or imported records, use an explicit system/migration actor or document a nullable-field policy rather than inventing a human actor.

Provenance fields are not a replacement for a dedicated audit log.

### 4.6 Audit trail

Maintain an append-only audit/event history for significant changes, including:

- Task status transitions (old/new status, actor, timestamp, and reason where applicable).
- Sale state transitions: completion, cancellation, reopening, and associated reasons/overrides.
- Advisor assignment/reassignment.
- Important edits to sale, customer, vehicle/catalog, and task fields.
- Document upload, replacement, and archive/deletion.
- Employee role changes and other security-sensitive administrative events.
- Exceptional permanent deletion.

For relevant events, store the actor, target entity/type and ID, event/action, timestamp, concise before/after change summary, and reason where required. Restrict audit-log access and prevent ordinary application roles from updating/deleting audit events. Never store passwords, tokens, full file contents, or unnecessary sensitive data in audit payloads. Keep authentication access logs separate from business audit logs.

### 4.7 Dates and time zone

Store system timestamps as UTC (`TIMESTAMPTZ`). Convert timestamps for frontend displays and generated PDFs using the `America/Lima` time zone. Do not rely on manually adding a fixed offset in application code when a named time zone can be used.

---

## 5. The 13-task operational process

### 5.1 Workflow rules applying to all tasks

The customer may initially contact a Sales Advisor through WhatsApp or telephone and receive an informal, non-final quotation outside the tracked process. If the customer decides to proceed, the advisor creates the sale register, and the formal workflow starts at **Task 1: Cotización del Vehículo**, the official quotation. The informal quotation is not a task.

Every sale has 13 task instances, created as `pending` when the sale register is created. The statuses are:

- `pending`
- `in_progress`
- `completed`

The process is **strictly linear**:

1. Task 1 is the only task eligible to start initially.
2. Task N can transition from `pending` to `in_progress` only after Task N−1 is `completed`.
3. Parallel, branched, and out-of-order progression is not allowed in the normal workflow.
4. At most one task may be `in_progress` at a time.
5. The current active task is the single `in_progress` task. If none is active, derive the next eligible task from the ordered statuses.
6. Every field/document listed below is mandatory unless explicitly marked optional.
7. Every task has an optional Notes field; task notes are internal and not customer-visible.
8. Task fields and upload controls stay disabled/read-only until the task transitions to `in_progress`.
9. Required data and documents must pass validation before a task can be completed.
10. Show a confirmation before status transitions, especially when completing a task.
11. Every uploaded file must record MIME/file type and size in bytes at minimum.

A task's recommended duration means elapsed time between its transition to `in_progress` and `completed`. Tasks without a specified duration have no predefined SLA duration.

### Task 1 — Cotización del Vehículo

**Purpose:** Prepare the official vehicle quotation, establishing the quoted total and the initial cost breakdown. The initial amount payable to Toyota and Grupo Pana commission are provisional and may change; they are finalized in Task 3. The accessory amount and vehicle release processing amount remain constant throughout the operation.

**Fields:**

- Initial amount payable to Toyota, USD — numeric. **Customer-visible.**
- Initial Grupo Pana commission, USD — numeric. **Customer-visible.**
- Accessory amount, USD — numeric. **Customer-visible.**
- Vehicle release processing amount, USD — numeric. **Customer-visible.**
- Quoted final vehicle price, USD — calculated as the sum of the initial Toyota amount, initial commission, accessory amount, and vehicle release processing amount. **Customer-visible.**
- Official vehicle quotation — PDF. **Customer-visible.**
- Official vehicle quotation — Excel. **Internal-only.**

**Recommended duration:** None.

### Task 2 — Debida Diligencia del Cliente

**Purpose:** Collect the signer's identity documents and Customer Knowledge Affidavit, determine PEP status, and record the applicable DDC regime.

For a Diplomatic customer, the signer is the customer. For an Embassy, Religious Entity, or International Organization, the signer is the representative/executing person.

**Fields:**

- Signer document type — dropdown: DNI, CE, PAS, CDI. **Customer-visible.**
- Signer document number — text. **Customer-visible.**
- Signer first name — text. **Customer-visible.**
- Signer last name — text. **Customer-visible.**
- Scanned signer identity document — PDF. **Customer-visible.**
- Customer Knowledge Affidavit — PDF. **Customer-visible.**
- `Vigencia de Poder` — PDF; required when `customer.type` is not `Diplomático`. **Customer-visible.**
- PEP status — dropdown: `No PEP`, `PEP`, `Relacionado con PEP`. **Internal-only.**
- DDC regime — dropdown: `General`, `Reforzado`. **Internal-only.**

**Recommended duration:** 3 days.

### Task 3 — Liquidación de Unidad

**Purpose:** Assign the vehicle's unique series and VIN identifiers, finalize the amount payable to Toyota and the Grupo Pana commission, and upload the unit settlement PDF.

Compared with Task 1, the Toyota amount and commission may change and are fully determined here. The quoted final price remains unchanged. The final commission is calculated as:

`final commission = Task 1 quoted final price − final Toyota amount − Task 1 accessory amount − Task 1 vehicle release processing amount`

The final commission cannot be negative; a negative result blocks task completion.

**Fields:**

- Vehicle series number — text, unique among eligible active/completed sales. **Customer-visible.**
- VIN — text, unique among eligible active/completed sales. **Customer-visible.**
- Final amount payable to Toyota, USD — numeric. **Customer-visible.**
- Final Grupo Pana commission, USD — calculated using the formula above. **Customer-visible.**
- Unit settlement document — PDF. **Internal-only.**

**Recommended duration:** 12 days.

### Task 4 — Pago a Grupo Pana

**Purpose:** Verify the customer's payment, recording the bank, transaction date, unique transaction number, amount, and payment voucher.

**Fields:**

- Transaction bank — dropdown including BCP, BBVA, Scotiabank, Interbank, and other supported banks. **Customer-visible.**
- Transaction date — date. **Customer-visible.**
- Transaction number — text, unique per bank (composite uniqueness on `transaction_bank` and `transaction_number`). **Customer-visible.**
- Deposited amount, USD — numeric; expected to match Task 1's quoted final price, if they differ require a `Mismatch Reason` before task completion. **Customer-visible.**
- Payment voucher — PDF. **Customer-visible.**

**Recommended duration:** None.

### Task 5 — Pago a Toyota

**Purpose:** Record the internal payment to Toyota, including bank details, proof of payment, and official payment confirmation.

**Fields:**

- Transaction bank — dropdown including BCP, BBVA, Scotiabank, Interbank, and other supported banks. **Internal-only.**
- Transaction date — date. **Internal-only.**
- Transaction number — text, unique per bank (composite uniqueness on `transaction_bank` and `transaction_number`). **Internal-only.**
- Deposited amount, USD — numeric; expected to match Task 3's final amount payable to Toyota. **Internal-only.**
- Payment voucher — PDF. **Internal-only.**
- Payment confirmation — PDF. **Internal-only.**

**Recommended duration:** None.

### Task 6 — Facturación

**Purpose:** Record the official invoices for the vehicle, accessories, commission, and vehicle release processing. Each invoice has a number, date, amount, and PDF file. Invoice numbers must include the full series and correlative number (e.g. `F001-000123`) to guarantee uniqueness.

All listed fields are **customer-visible.**

**Fields:**

- **Toyota invoice:** number (text, full series + correlative, unique), date, amount in USD (expected to match the final Toyota amount from Task 3), PDF.
- **Commission invoice:** number, date, amount in USD (expected to match the final commission from Task 3), PDF.
- **Accessories invoice:** number, date, amount in USD (expected to match Task 1's accessory amount), PDF.
- **Vehicle release processing invoice:** number, date, amount in USD (expected to match Task 1's release processing amount), PDF.

**Recommended duration:** None.

### Task 7 — Documentos Endosados

**Purpose:** Receive and upload the official endorsed documents required to continue with customs processing.

**Fields:**

- Endorsed documents — PDF. **Internal-only.**

**Recommended duration:** 10 days.

### Task 8 — Trámite Aduanero

**Purpose:** Manage vehicle nationalization/customs processing, recording the deposit order, DAM number, customs office, control channel, and customs certificate.

**Fields:**

- Deposit order (`Pedido de Depósito`) — PDF. **Internal-only.**
- Customs Declaration of Goods (DAM) number — text. **Internal-only.**
- Customs office — dropdown populated with supported customs offices in Peru. **Internal-only.**
- Control channel — dropdown: `Verde`, `Naranja`, `Rojo`. **Internal-only.**
- Customs certificate — PDF. **Internal-only.**

**Recommended duration:** 12 days.

### Task 9 — Trámite de Liberación

**Purpose:** Assign an internal person in charge and track the vehicle's release period.

**Fields:**

- Person in charge — text. **Internal-only.**

**Recommended duration:** 30 days.

### Task 10 — Inmatriculación y Placas

**Purpose:** Register the vehicle legally, assign its definitive license plate, and upload the Electronic Vehicle Identification Card (`TIVe`).

**Fields:**

- License plate number — text, unique among eligible active/completed sales. **Customer-visible.**
- Registration date — date. **Customer-visible.**
- Electronic Vehicle Identification Card (`TIVe`) — PDF. **Customer-visible.**

**Recommended duration:** 15 days.

### Task 11 — Traslado a PDS

**Purpose:** Record the date the vehicle is transferred to the pre-delivery inspection center.

**Fields:**

- Transfer date — date. **Customer-visible.**

**Recommended duration:** None.

### Task 12 — Equipamiento

**Purpose:** Record accessory installation, service-order information, and completion date.

**Fields:**

- Service order number — text. **Internal-only.**
- Service order — PDF. **Internal-only.**
- Equipment completion date — date. **Customer-visible.**

**Recommended duration:** None.

### Task 13 — Entrega de Vehículo

**Purpose:** Coordinate final delivery, recording the optional transfer date to Surquillo, official delivery date, and signed delivery record.

**Fields:**

- Transfer date to Surquillo — date, optional. **Internal-only.**
- Vehicle delivery date — date. **Customer-visible.**
- Signed vehicle delivery record — PDF. **Customer-visible.**

**Recommended duration:** None.

### 5.2 Task editing and rollback rules

- Sales Advisors may update tasks assigned to their sales while the task is `in_progress`; once a task is `completed`, it becomes read-only for them.
- Sales Managers and System Admins may edit fields or replace documents in a completed task without changing its status. Each such edit requires a mandatory `Reason for Edit` and an append-only audit event.
- A Sales Manager or System Admin may revert the most recently completed task to `in_progress`. Record a mandatory reason and audit event.
- A Sales Manager or System Admin may revert an `in_progress` task to `pending`, with a documented reason and audit event; this pauses its SLA process becoming read-only.
- Do not allow a rollback that violates the strict sequence. To correct an earlier task while later tasks have progressed, later work must be rolled back in reverse order first.

---

## 6. Customer data, accounts, and identification

### 6.1 Customer categories and identity

Customers are grouped as follows:

- **B2C:** Diplomatic customer.
- **B2B:** Embassy, Catholic religious entity, non-Catholic religious entity, and International Organization.

Document types:

- **B2C:** DNI, CE, PAS, CDI.
- **B2B:** RUC.

The combination `(document_type, document_number)` must be unique within `Customers`. Preserve leading zeros; identifiers are text, not numbers.

### 6.2 Customer profile fields

- Customer type.
- Document type and document number.
- First, last name, and gender for B2C individuals.
- Legal name (`Razón Social`) for B2B entities.
- Nationality/country.
- Phone and email.
- For B2B, contact person's first name, last name, and job title.
- Authentication credentials managed by the authentication system.
- `created_by`, `created_at`, `updated_by`, and `updated_at` as applicable.

Customers cannot directly edit their document, name, email, or phone through the portal. Employees can modify customer records according to the RBAC matrix. Historical sale snapshots must not change when the live customer profile changes.

### 6.3 DNI/RUC name lookup

The system must automatically retrieve customer name data using the Codart API (`[https://api-codart.cgrt.org/](https://api-codart.cgrt.org/)`). For DNI lookups, the backend must extract and auto-fill the customer's first and last names. For RUC lookups, the backend must extract and auto-fill the "Razón Social" (legal name).

To ensure uninterrupted operations, the frontend must implement a manual fallback mechanism. If the API request fails, times out, or exhausts its free-tier quota, the UI must gracefully unlock the input fields and allow the advisor to manually type the customer's details.

### 6.4 Customer accounts and onboarding

- Employees create customer accounts, subject to role permissions.
- The current specified flow generates a secure temporary password and emails the customer the portal link, document type/number as login identifier, and temporary password.
- On first login with that temporary password, the customer is trapped in a mandatory **Set New Password** screen and cannot access the portal until the new password is saved.
- Customers can independently reset their passwords through the Forgot Password flow.
- Never store plaintext passwords; store password hashes only.

### 6.5 Static customer avatars

The customer profile should show a high-quality static avatar served from local frontend assets (SVG/PNG), selected conditionally as one of three variants: B2C Male, B2C Female, or B2B Entity. Do not build an avatar upload/database/file-storage feature for customer avatars. The gender field, if retained to choose a B2C avatar, should not be treated as a security or identity attribute.

---

## 7. Employee records and accounts

Employee fields:

- Document type: DNI, CE, or PAS.
- Document number.
- First name and last name.
- Nationality/country.
- Gender.
- Profile picture.
- Birthdate.
- Hire date.
- Active/inactive status.
- Role (`System Admin`, `Sales Manager`, `Sales Advisor`).
- Personal phone and email.
- Business phone and email.
- Authentication credentials managed securely.
- `created_by`, `created_at`, `updated_by`, and `updated_at` as applicable.

The combination `(document_type, document_number)` must be unique within `Employees`. An identifier may appear in both Customers and Employees if the same person legitimately holds both account types; the authentication system must distinguish the account type and avoid cross-portal access leaks.

---

## 8. Vehicle catalog

The catalog supports selecting a model, version, and a color available for that model.

### Model

- Model name.
- Description.
- One or more categories: `Camioneta`, `Comercial`, `Familiar`, `Hatchback`, `Sedan`.
- Available versions and colors.
- Active/inactive state.
- Creation/update provenance.

### Version

- Version name.
- Parent model.
- Reference price.
- Active/inactive state.
- Creation/update provenance.

### Color and catalog images

- Available colors may vary by model.
- Authorized employees may upload/replace images for each color.
- Supported viewpoints: Main view, Exterior front, Exterior left side, Exterior right side, Exterior rear, Interior.
- A Main view image is required; other viewpoints may be optional. Display a clean placeholder for missing optional viewpoints.
- Record image MIME type, size in bytes, storage reference, uploader, and upload timestamp.
- System Admin has full catalog CRUD; Sales Manager may create/edit models and versions, upload images, and archive old entries; Sales Advisor is read-only for browsing/selecting vehicles.

The selected version's reference price and the names/identifiers of the selected model, version, and color must be snapshotted in the sale register at creation, so later catalog changes do not alter the historical sale.

---

## 9. Customer portal and six macro-milestones

The customer experience should communicate progress clearly without exposing all internal operational complexity. The internal model has 13 tasks; the customer portal presents six macro-milestones.

Customers can view:

- Vehicle model, version, categories, selected color, images, and the reference price snapshot.
- Assigned Sales Advisor's full name, contact email, and phone number.
- Sale creation timestamp, overall sale state, and progress timeline.
- Only task fields/documents designated customer-visible, subject to server-side authorization.

### The six milestones

1. **Cotización y Documentación** — Tasks 1–2. Establishes the official quotation and validates the signer's identity documentation.
2. **Asignación y Pago** — Tasks 3–4. Confirms physical vehicle assignment by series/VIN and enables the customer payment to Grupo Pana.
3. **Facturación Oficial** — Tasks 5–6. Confirms Toyota payment processing and issuance of the official invoices.
4. **Trámites Aduaneros** — Tasks 7–8. Indicates that endorsed documents have been processed and the vehicle is in the customs/nationalization process.
5. **Liberación y Placas** — Tasks 9–10. Communicates the vehicle release and progress toward registration and license-plate assignment.
6. **Preparación y Entrega** — Tasks 11–13. Covers the move to pre-delivery inspection, equipment/accessory installation, and final delivery.

### Milestone state and filtering

Derive milestone state from the fixed task order. Do **not** store an independently editable milestone field in `Sale_Registers` because it duplicates task status and may drift out of sync. A milestone is:

- `completed` when all tasks in the milestone are completed.
- `in_progress` when the milestone contains the currently active task.
- `pending` otherwise.

The API, customer portal, employee operation filters, and BI dashboard must use the same derived logic. A database view or reusable query is an appropriate starting point. Consider caching/denormalization only if actual performance measurements demonstrate a need, and ensure derived-state consistency transactionally or through a reliable mechanism. Show the overall sale state separately from milestone state, especially when a sale is completed or cancelled.

Customer-visible fields/documents must be enforced on the server, not merely hidden in UI components.

---

## 10. Customer email notifications

The goal is to notify customers about meaningful events rather than every internal task transition. Implement idempotent delivery: retries, scheduler overlap, or task rollback/recompletion must not send a successful milestone notification twice for the same sale and event. Store each attempt and outcome. Prefer secure authenticated portal links over attaching sensitive files directly to email.

###### Notification 1 — Account creation (once per customer)

- Trigger: a Sales Advisor registers the customer for the first time.
- Subject: `Bienvenido a Grupo Pana - Acceso a tu portal de seguimiento`
- Content: welcome message, portal link, document type/number as login identifier, temporary password under the currently specified onboarding flow, and notice that it must be changed immediately on first login.

###### Notification 2 — Sale register created

- Trigger: a Sales Advisor creates a sale register and assigns a vehicle.
- Subject: `Hemos registrado tu nueva solicitud de vehículo`
- Content: confirmation that the process has started, vehicle model/color, assigned advisor's name and WhatsApp/contact number, and a link to Milestone 1.

###### Notification 3 — Official quotation available

- Trigger: Task 1 completed.
- Subject: `Tu cotización oficial está lista para revisión`
- Content: indicate that the official quotation is available and provide an authenticated portal link to download the customer-visible PDF.

###### Notification 4 — Vehicle assignment and payment is next

- Trigger: Task 3 completed.
- Subject: `Siguiente paso: Tu vehículo ha sido asignado`
- Content: provide the assigned series and VIN, and direct the customer to the portal for the next step: payment to Grupo Pana.

###### Notification 5 — Invoices issued

- Trigger: Task 6 completed.
- Subject: `Tus comprobantes de pago han sido emitidos`
- Content: confirm that the invoicing steps have been recorded and customer-visible invoices are available in the portal.

###### Notification 6 — Customs processing begins

- Trigger: Task 7 completed.
- Subject: `Iniciamos los trámites aduaneros de tu vehículo`
- Content: explain that endorsed documents have been processed and customs/nationalization procedures are underway. Do not promise an unsupported delivery date.

###### Notification 7 — License plate assigned

- Trigger: Task 10 completed.
- Subject: `¡Tu vehículo ya cuenta con placa oficial!`
- Content: provide the definitive plate number and a secure portal link to the customer-visible TIVe PDF.

###### Notification 8 — Final vehicle preparation

- Trigger: Task 11 completed.
- Subject: `Tu vehículo está en fase de preparación final`
- Content: tell the customer the vehicle has entered the pre-delivery preparation/equipment phase.

###### Notification 9 — Delivery completed

- Trigger: Task 13 completed.
- Subject: `¡Felicidades por tu nuevo vehículo! / Gracias por confiar en Grupo Pana`
- Content: thank the customer, confirm the delivery date, and provide a secure portal link to the signed delivery record PDF.

Before dispatching a milestone email, check `Notification_Logs`. Once a specific milestone notification for a sale has been successfully sent, do not resend it if the task is reverted and completed again. The initial notification-log design should support a unique idempotency key based on sale + event/notification type (and a clearly defined policy for failures/retries).

---

## 11. Employee SLA reminders, deadlines, and escalation

A scheduled server-side process evaluates tasks with a recommended duration and sends reminder/escalation emails. Use stateless scheduled database queries comparing the current time with stored/calculated timestamps, not active in-memory timers.

### Due-date calculation

- When a task transitions from `pending` to `in_progress`, calculate `due_date = started_at + recommended_duration`.
- Use elapsed calendar time; weekends and non-business hours do not pause the clock. Example: a 3-day task started Friday at 4:00 PM is due Monday at 4:00 PM.
- Tasks with no recommended duration do not receive duration-based reminders.
- If a task is reverted to `pending`, its SLA process pauses. Before implementation, specify whether restarting it preserves remaining time or starts a new SLA interval; do not leave this undefined in code.

The behavior of the task's `due_date` depends strictly on the state transition:

- Reopened Tasks (`completed` to `in_progress`): The system must preserve the original `due_date`. If a task is reopened for corrections, the deadline does not reset, ensuring accurate reporting on task quality and delays.
- Restarted Tasks (`in_progress` to `pending` to `in_progress`): The active SLA timer is discarded. When the task is eventually restarted, the backend must calculate a new `due_date` based on the fresh `started_at` timestamp and the task's recommended duration.

### Approaching-due warning

Send one `Approaching Due` warning when 80% of the recommended duration has elapsed.

### Recurring reminder interval and cap

- Tasks with duration **≤ 3 days:** repeat every 12 hours.
- Tasks with duration **10–15 days:** repeat every 24 hours.
- Task with duration **30 days:** repeat every 48 hours.
- Hard cap: 6 overdue recurring reminders per task.
- The intervals above cover all currently specified task durations (3, 10, 12, 12, 15, and 30 days). If a new duration falls outside these ranges, require a defined policy rather than silently guessing.

### Escalation recipients

Escalate based on `recurring_reminder_count`, not fixed overdue hours:

- **Level 1 — Sales Advisor:** 80% warning and the first overdue recurring reminder.
- **Level 2 — Sales Manager:** second and third overdue recurring reminders.
- **Level 3 — System Admin:** fourth recurring reminder and beyond, with visual UI highlights.

No overdue state should automatically unlock or reassign a task.

### Reminder state and analytics

Track at least:

- `last_reminder_sent_at` — timestamp.
- `current_reminder_phase` — `approaching`, `overdue`, or `recurring`.
- `recurring_reminder_count` — integer, capped at 6.
- `completion_phase` — `early`, `in_approaching`, `overdue`, `recurring_overdue`, or `not_applicable`.

Record each reminder dispatch in an append-only `Notification_Logs` table, including delivery status. Show UI indicators for `Approaching`, `Overdue`, and `Escalated/Recurring` and provide quick filters for urgent tasks. Tasks without a recommended duration use `not_applicable` and are excluded from SLA averages.

---

## 12. Document and file management

Tasks can require Excel and PDF documents. Provide a secure file workflow supporting:

- Upload validation and private/public storage policies.
- MIME type and size in bytes for every upload.
- Original file name, uploader, timestamp, storage key, sale/task association, and document type.
- Replacement behavior and version history where needed.
- Deletion/deactivation rules and audit history.
- Maximum file size and allowed file formats.
- Role-based upload, replace, archive, and download permissions.
- Explicit customer visibility for each document.
- Authenticated or time-limited private access.
- Handling of missing/unavailable files.

The database should usually store metadata and storage references rather than binary contents. A private document must not be accessible merely because a user knows its URL. Generate temporary signed URLs only after the backend has checked identity, role, ownership, and customer visibility.

### Required storage direction

Use **Cloudflare R2** as the initial file-storage choice, using its S3-compatible API:

- Public access may be used for non-sensitive catalog/profile images only if the public-bucket risks are understood and the assets truly are intended to be public.
- Private storage must be used for confidential PDFs such as DDC forms, identity documents, invoices, and other sensitive legal/financial documents.
- Private documents must only be accessed through temporary signed URLs generated by the backend after authorization.

Record metadata for document files and catalog images. Customer profile avatars are a special case: serve three static avatar variants from local frontend assets (B2C Male, B2C Female, B2B Entity); do not create an avatar upload/storage feature.

---

## 13. BI dashboard and analytics

Build a polished BI dashboard within the employee application. Start from the operational and management decisions the dashboard should support. Do not add charts only to make the dashboard look impressive.

Candidate questions include:

- How many sales are `active`, `completed`, and `cancelled`?
- Which tasks are approaching due, overdue, or escalated?
- Where are process bottlenecks?
- How long does each task take, and how long does a complete operation take?
- How do created/completed/cancelled operations trend by month?
- How many operations are in each of the six customer-facing macro-milestones?
- Which vehicle models, versions, colors, and customer types are most common?
- How many active sales are assigned to each advisor?
- What are each advisor's pipeline and workload?
- What are task timing and operation completion performance?
- How many sales are cancelled, and for what reasons?
- What are the progression/conversion rates, with precise definitions?
- Which sales require attention today?
- Which authorized billing/commission indicators can be calculated from recorded values?

Possible filters: date period, sale state, derived current macro-milestone, customer type/entity, vehicle model/version/color, assigned advisor, sale temperature, and urgency/overdue state.

For each KPI, specify numerator, denominator, time period, inclusion/exclusion criteria, and source fields. Do not claim the system knows recognized revenue or official accounting results unless the data supports it; distinguish recorded operational amounts from verified accounting facts.

Use the same derived milestone logic as the customer portal. Do not require a duplicate manually maintained milestone field in every sale record. Any advisor-level dashboard must show only metrics the advisor is authorized to view; System Admin and Sales Manager have global views.

Use **Recharts** for the React dashboard. Recommend the best maintainable implementation that meets the needs; a separate analytics platform is unnecessary unless justified.

---

## 14. Authentication, sessions, and access logs

### 14.1 Separate login experiences

Provide two separate login interfaces/routes, for example:

- Employee login: `/admin` or another appropriate employee-facing route.
- Customer login: `/portal`.

Separate interfaces serve UX/routing purposes and are not a security boundary by themselves. Enforce account type, role, record ownership, and resource authorization on the backend.

### 14.2 Login inputs

Email is not the login identifier. Both login interfaces require:

1. Document type dropdown.
2. Document number text field.
3. Password field.
4. `Olvidé mi contraseña` link.
5. `Mantener sesión iniciada` checkbox.

Customer document types: DNI, CE, RUC, PAS, CDI. Employee document types: DNI, CE, PAS. Validate format dynamically by type (e.g. DNI typically has 8 digits, RUC 11), but implement validation server-side and keep rule details maintainable/configurable.

Enforce composite uniqueness on `(document_type, document_number)` within both `Customers` and `Employees`. Normalize identifiers consistently and preserve meaningful leading zeros. If the same identifier appears in both tables, the requested portal/account type must determine which account is authenticated.

### 14.3 Custom token strategy

Use custom authentication with `bcrypt` password hashing, short-lived JWT access tokens and long-lived refresh tokens:

- **Access token:** stateless signed JWT, 15-minute lifetime, returned to frontend memory rather than browser persistent storage. Validate it cryptographically. Include account type, user ID, role, and appropriate claims; ensure role changes/deactivation do not leave stale privileges effective longer than the chosen policy permits.
- **Refresh token:** secure opaque random token, 30-day lifetime, stored as a hash in `Refresh_Tokens` and delivered only using an `HttpOnly` cookie to prevent XSS theft.
- **Refresh rotation:** whenever the frontend uses the refresh token to get a new access token, the backend must rotate the token by invalidating the old refresh token in the database, generating a new one, resetting the 30-day expiration, and returning the new cookie.
- **Remember Me:** checked means persistent cookie with explicit `Max-Age` of 30 days; unchecked means a session cookie. Use appropriate `Secure` and `SameSite` attributes and CSRF protection where applicable.
- **Logout:** revoke the applicable refresh token/session and clear the cookie. Define access-token expiration and refresh-token cleanup behavior.

JWT alone is not a complete session-management strategy. Do not store plaintext passwords or refresh tokens.

### 14.4 Authentication access logs

Create an append-only `Access_Logs` table. Log:

- `user_type`: `Employee` or `Customer`.
- Attempted `document_type` and `document_number`.
- `user_id` if the account is identified (nullable for unknown identifiers/failed logins).
- `action_type`: `LOGIN_SUCCESS`, `LOGIN_FAILED`, or `LOGOUT`.
- Device information, where available.
- IP address, if available and reliably obtained.
- UTC timestamp.

Log successful logins, failed attempts (unknown ID or wrong credentials), and explicit logouts. Protect logs from ordinary user modification/deletion, avoid logging secrets, and define access/retention policies. Because user IDs refer to either of two tables, choose a correct relational design for this polymorphic relationship rather than assuming one ordinary foreign key can reference both tables.

---

## 15. Required technology stack

The current intent is to keep prototyping, development, testing, and stakeholder reviews at **zero cost** using provider free tiers. Use this specified stack unless you identify a blocker that requires approval before a change:

- **Frontend:** React with Vite and TypeScript, Recharts for BI/Analytics.

* **Backend:** Go (Golang) using the **Chi** router (`github.com/go-chi/chi`). Chi is chosen for its strict adherence to Go's standard `net/http` library, zero-allocation routing, and lightweight middleware execution—ideal for enforcing strict Role-Based Access Control (RBAC) and cross-portal auth isolation. Hosted in Render (Free Web Service tier), running as a single compiled Go executable.
* **Database:** Supabase PostgreSQL, using `pgx` (`github.com/jackc/pgx/v5`) for high-performance connectivity and query execution. Consider integrating `sqlc` to generate type-safe Go code from SQL queries. The 500 MB free tier limit provides sufficient prototyping space, and our automated background jobs will prevent the database from pausing due to the one-week inactivity rule.
* **File storage:** Cloudflare R2 (S3-compatible API). Use public buckets for catalog/profile images and private buckets for confidential documents. Private documents accessed via temporary signed URLs created by the backend. AWS SDK for Go (`aws-sdk-go-v2`) configured for S3-compatible endpoints to handle direct streaming to Cloudflare R2.
* **Request validation:** `go-playground/validator` integrated into Chi HTTP handlers to enforce strict schema boundaries on incoming JSON payloads prior to database execution.
* **Authentication:** `golang-jwt/jwt/v5` for stateless access token verification combined with standard Go `http.Cookie` management for secure `HttpOnly` Refresh Token delivery and rotation. Use `x/crypto` for Argon2id password hashing.
* **Email:** HTTP-based Transactional Email API via **Resend** (`[github.com/resend/resend-go/v2](https://github.com/resend/resend-go/v2)`). Resend is strictly required because Render's free tier explicitly blocks outbound standard SMTP ports (25, 465, 587). The free tier (3,000 emails/month) is sufficient for routing HTML SLA escalation warnings and milestone notifications over HTTPS.

- **Scheduled background jobs:** Cron-job.org calls two protected API endpoints:
  1. `POST /api/internal/process-reminders` — twice daily, evaluate SLA deadlines and dispatch emails.
  2. `POST /api/internal/cleanup-tokens` — weekly, permanently delete rows from the `Refresh_Tokens` table where `expires_at` is in the past.

Protect Cron-job.org-triggered endpoints with a strong secret or equivalent request-authentication mechanism, safe secret storage, request validation, and rate limiting. Do not expose internal job endpoints as unauthenticated public actions.

---

## 16. Initial database proposal

The schema below records the current design direction and is provided as a starting proposal. **Do not blindly accept it or finalize it before validating the requirements.** Review normalization, constraints, data lifecycle, data integrity, security, and query needs. Explain any changes with their reasoning while preserving the business rules.

### 16.1 `Sale_Registers` — one row per sale

Holds sale identity, immutable snapshots, assignment, and macro-level state.

- `id` — UUID primary key.
- `customer_id` — reference to `Customers`.
- `customer_legal_name_snapshot` — text.
- `customer_doc_type_snapshot` — text.
- `customer_doc_number_snapshot` — text.
- `vehicle_version_id` — reference to `Vehicle_Versions`.
- `vehicle_color_id` — reference to `Vehicle_Colors`.
- `vehicle_model_name_snapshot` — text.
- `vehicle_version_name_snapshot` — text.
- `vehicle_color_name_snapshot` — text.
- `vehicle_reference_price_snapshot` — `NUMERIC(12,2)`.
- `sale_temperature` — `Hot`, `Warm`, or `Cold`; immutable after creation.
- `overall_state` — `active`, `completed`, or `cancelled`.

* `vehicle_series` — text, nullable until Task 3; unique across active and completed sales.
* `vin` — text, nullable until Task 3; unique across active and completed sales.
* `license_plate` — text, nullable until Task 10; unique across active and completed sales.

- `assigned_advisor_id` — reference to `Employees`.
- `sale_notes` — optional internal sale notes.
- `created_by` — reference to `Employees`.
- `created_at` — `TIMESTAMPTZ` UTC.
- `updated_by` — reference to `Employees`.
- `updated_at` — `TIMESTAMPTZ` UTC.

The fields `vehicle_series`, `vin`, and, `license_plate` are physically stored in `Sale_Registers` even though they are entered through the corresponding task interfaces.

PostgreSQL must enforce physical identifier (series, VIN, license-plate) uniqueness through partial unique indexes on `Sale_Registers`, scoped to sales whose `overall_state` is `active` or `completed`.

### 16.2 `Task_Instances` — thirteen rows per sale

Tracks ordered progress and SLA reminder state.

- `id` — UUID primary key.
- `sale_id` — reference to `Sale_Registers`.
- `task_number` — integer 1–13.
- `task_name` — text.
- `status` — `pending`, `in_progress`, or `completed`.
- `started_at` — UTC timestamp; null until started.
- `completed_at` — UTC timestamp; null until completed.
- `due_date` — UTC timestamp calculated from `started_at + recommended_duration` where duration exists.
- `notes` — optional internal task notes.
- `completion_phase` — `early`, `in_approaching`, `overdue`, `recurring_overdue`, or `not_applicable`.
- `last_reminder_sent_at` — UTC timestamp.
- `current_reminder_phase` — `approaching`, `overdue`, or `recurring`.
- `recurring_reminder_count` — integer, default 0, capped at 6.

Add a uniqueness constraint on `(sale_id, task_number)` and enforce one active task/strict transition rules using an appropriate transactional backend/database strategy.

Consider whether task definitions and recommended durations should live in a separate `Task_Definitions` table instead of being duplicated as mutable text/values per sale.

### 16.3 `Sale_Operation_Details` — one-to-one details record

The current proposal stores typed fields from the 13 tasks in one details row per sale, with a unique `sale_id`. Fields are progressively populated as tasks advance.

- `id` — UUID primary key.
- `sale_id` — unique reference to `Sale_Registers`.

**Task 1 fields**

- `initial_toyota_amount` — `NUMERIC(12,2)`.
- `initial_commission` — `NUMERIC(12,2)`.
- `accessory_amount` — `NUMERIC(12,2)`.
- `release_processing_amount` — `NUMERIC(12,2)`.
- `quoted_final_price` — `NUMERIC(12,2)`, calculated sum.

**Task 2 fields**

- `signer_doc_type` — DNI, CE, PAS, CDI.
- `signer_doc_number` — text.
- `signer_first_name` — text.
- `signer_last_name` — text.
- `pep_status` — `No PEP`, `PEP`, `Relacionado con PEP`.
- `ddc_regime` — `General`, `Reforzado`.

**Task 3 fields**

- `final_toyota_amount` — `NUMERIC(12,2)`.
- `final_commission` — `NUMERIC(12,2)` with a non-negative check.

**Task 4 fields**

- `pana_payment_bank` — text.
- `pana_payment_date` — `DATE`.
- `pana_payment_transaction_number` — text (composite unique constraint with `pana_payment_bank`).
- `pana_deposited_amount` — `NUMERIC(12,2)`.
- `pana_payment_mismatch_reason` — text, required when the amount differs from the Task 1 quoted price.

**Task 5 fields**

- `toyota_payment_bank` — text.
- `toyota_payment_date` — `DATE`.
- `toyota_payment_transaction_number` — text (composite unique constraint with `toyota_payment_bank`).
- `toyota_deposited_amount` — `NUMERIC(12,2)`.

**Task 6 fields**

- `toyota_invoice_number` — text.
- `toyota_invoice_date` — `DATE`.
- `toyota_invoice_amount` — `NUMERIC(12,2)`.
- `commission_invoice_number` — text.
- `commission_invoice_date` — `DATE`.
- `commission_invoice_amount` — `NUMERIC(12,2)`.
- `accessories_invoice_number` — text.
- `accessories_invoice_date` — `DATE`.
- `accessories_invoice_amount` — `NUMERIC(12,2)`.
- `release_processing_invoice_number` — text.
- `release_processing_invoice_date` — `DATE`.
- `release_processing_invoice_amount` — `NUMERIC(12,2)`.

**Task 8 fields**

- `dam_number` — text.
- `customs_office` — text or a controlled reference.
- `control_channel` — `Verde`, `Naranja`, `Rojo`.

**Task 9 field**

- `release_person_in_charge` — text.

**Task 10 fields**

- `registration_date` — `DATE`.

**Task 11 field**

- `pds_transfer_date` — `DATE`.

**Task 12 fields**

- `equipment_service_order_number` — text.
- `equipment_completion_date` — `DATE`.

**Task 13 fields**

- `surquillo_transfer_date` — `DATE`, optional.
- `vehicle_delivery_date` — `DATE`.

### 16.4 `Documents` — file registry

Stores all file uploads across all tasks.

- `id` — UUID primary key.
- `sale_id` — reference to `Sale_Registers`.
- `task_instance_id` — reference to `Task_Instances`.
- `document_type` — controlled type such as `official_quotation_pdf`, `official_quotation_excel`, `pana_payment_voucher`, `toyota_invoice`, `tive_document`, etc.; define the complete supported set.
- `original_file_name` — text.
- `mime_type` — text (e.g., `application/pdf`).
- `size_bytes` — `BIGINT`.
- `storage_key` — Cloudflare R2 object key/reference.
- `status` — `active` or `archived`.
- `uploaded_by` — reference to `Employees`.
- `uploaded_at` — UTC timestamp.

### 16.5 `Employees`

- `id` — UUID primary key.
- `document_type` — DNI, CE, PAS.
- `document_number` — text; composite unique with `document_type`.
- `first_name`, `last_name`, `nationality` — text.
- `gender` — `M` or `F`.
- `birthdate`, `hire_date` — `DATE`.
- `personal_phone`, `personal_email`, `business_phone`, `business_email` — text.
- `profile_picture_storage_key` — nullable Cloudflare R2 key/reference.
- `profile_picture_mime_type` — text (e.g., `image/jpeg`), nullable.
- `profile_picture_size_bytes` — `BIGINT`, nullable.
- `role` — `System Admin`, `Sales Manager`, or `Sales Advisor`.
- `password_hash` — text.
- `is_active` — boolean, default true.
- `created_by` — reference to `Employees`.
- `created_at` — UTC timestamps.
- `updated_by` — reference to `Employees`.
- `updated_at` — UTC timestamps.

### 16.6 `Customers`

- `id` — UUID primary key.
- `customer_type` — `Diplomático`, `Embajada`, `Entidad religiosa católica`, `Entidad religiosa no católica`, `Organismo Internacional`.
- `document_type` — DNI, CE, PAS, CDI, RUC.
- `document_number` — text; composite unique with `document_type`.
- `first_name`, `last_name` — nullable for B2B.
- `gender` — `M` or `F`, nullable for B2B.
- `legal_name` — text, `Razón Social`, nullable for B2C.
- `nationality` — text.
- `phone`, `email` — text.
- `contact_first_name`, `contact_last_name`, `contact_job_title` — text, nullable for B2C.
- `password_hash` — text.
- `must_change_password` — boolean, default true.
- `created_by` — reference to `Employees`.
- `created_at` — UTC timestamps.
- `updated_by` — reference to `Employees`.
- `updated_at` — UTC timestamps.

### 16.7 Vehicle catalog tables

**`Vehicle_Models`**

- `id` — UUID primary key.
- `model_name` — text.
- `description` — text.
- `categories` — currently described as categories such as Camioneta, Comercial, Familiar, Hatchback, Sedan. Because a model may belong to multiple categories, propose a suitable relational/array representation and explain the choice.
- `is_active` — boolean; prefer deactivation over hard deletion.
- `created_by`, `created_at`, `updated_by`, `updated_at`.

**`Vehicle_Versions`**

- `id` — UUID primary key.
- `model_id` — reference to `Vehicle_Models`.
- `version_name` — text.
- `reference_price` — `NUMERIC(12,2)`.
- `is_active` — boolean.
- `created_by`, `created_at`, `updated_by`, `updated_at`.

**`Vehicle_Colors`**

- `id` — UUID primary key.
- `model_id` — reference to `Vehicle_Models` because colors may vary by model.
- `color_name` — text.
- `is_active` — boolean.
- `created_by`, `created_at`, `updated_by`, `updated_at`.

**`Catalog_Images`**

- `id` — UUID primary key.
- `vehicle_color_id` — reference to `Vehicle_Colors`.
- `viewpoint` — Main view, Exterior front, Exterior left side, Exterior right side, Exterior rear, Interior.
- `mime_type` — text (e.g., `image/jpeg`).
- `size_bytes` — `BIGINT`.
- `storage_key` — Cloudflare R2 object key/reference.
- `uploaded_by` — reference to `Employees`.
- `uploaded_at` — UTC timestamp.
- Unique constraint on `(vehicle_color_id, viewpoint)` so there is at most one active image per viewpoint/color.

### 16.8 `Employee_Refresh_Tokens`

- `id` — UUID primary key.
- `employee_id` — reference to `Employees`.
- `token_hash` — text.
- `expires_at`, `created_at` — UTC timestamps.

### 16.9 `Customer_Refresh_Tokens`

- `id` — UUID primary key.
- `customer_id` — reference to `Customers`.
- `token_hash` — text.
- `expires_at`, `created_at` — UTC timestamps.

### 16.10 `Access_Logs`

- `id` — UUID primary key.
- `portal_type` — enum (`employee_portal`, `customer_portal`) indicating which API login endpoint was targeted.
- `employee_id` — UUID. Nullable foreign key to `Employees(id)`.
- `customer_id` — UUID. Nullable foreign key to `Customers(id)`.
- `attempted_document_type` — text.
- `attempted_document_number` — text.
- `action_type` — enum (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`).
- `device_info` — text (nullable).
- `ip_address` — text (nullable).
- `created_at` — UTC timestamp.

Must implement a database-level constraint: `CHECK (employee_id IS NULL OR customer_id IS NULL)`. Both can be null (e.g., failed login for an unknown user), but they can never both be populated.

### 16.11 `Audit_Logs`

Append-only business audit ledger. Proposed fields:

- `id` — UUID primary key.
- `employee_id` — reference to `Employees`.

* `entity_type` — enum (`Sale_Register`, `Task_Instance`, `Sale_Operation_Details`, `Document`, `Customer`, `Employee`, `Vehicle_Model`, `Vehicle_Version`, `Vehicle_Color`).

- `entity_id` — target record ID.
- `action` — controlled event such as `SALE_CREATED`, `SALE_CANCELLED`, `SALE_REOPENED`, `ADVISOR_REASSIGNED`, `TASK_STARTED`, `TASK_COMPLETED`, `TASK_REVERTED`, `TASK_EDITED`, `DOCUMENT_UPLOADED`, `DOCUMENT_REPLACED`, `DOCUMENT_ARCHIVED`, `CATALOG_CREATED`, `CATALOG_UPDATED`, `CATALOG_ARCHIVED`, `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `EMPLOYEE_ROLE_CHANGED`, `EMPLOYEE_DEACTIVATED`, and other events required to cover the stated audit policy.
- `changes_summary` — `JSONB` before/after payload, minimizing sensitive data, e.g., `{ "field": "vin", "old": "A", "new": "B" }`).
- `reason` — text, required for cancellation and edits to completed tasks, and any other action designated to require it.
- `created_at` — UTC timestamp.

### 16.12 `Notification_Logs`

Track dispatched emails, failures, deduplication, milestone notices, and SLA escalation delivery. Proposed fields:

- `id` — UUID primary key.
- `sale_id` — reference to `Sale_Registers`, nullable for a general welcome email if needed.
- `task_instance_id` — nullable reference to `Task_Instances`.
- `notification_type` — controlled type such as `Welcome`, `Account_Creation`, `Escalation_Level_2`.
- `recipient_email` — text.
- `status` — `SENT` or `FAILED`.
- `dispatched_at` — UTC timestamp.

### 16.13 Schema-level invariants to verify

- One sale has exactly 13 task instances with `task_number` 1–13.
- Each sale has at most one `in_progress` task, and it must be the next eligible task in the linear sequence.
- Money uses fixed-precision numeric types, never binary floating-point.
- Payment transaction uniqueness is per bank + transaction number.
- Invoice uniqueness uses the full series and correlative.
- Customer and Employee document identities are unique within each respective table.
- Historical customer and vehicle snapshots remain unchanged by future profile/catalog updates.
- Important state transitions, overrides, document changes, and deletions are audited.
- Customer-visible document access is enforced server-side.

Provide the final relational model only after critically reviewing this proposal. Include indexes, foreign keys, constraints, relationships/cardinalities, and an ERD. Avoid needless tables, but do not force unrelated or highly variable data into one table just to minimize table count.

---

## 17. Functional and non-functional requirements

### Functional requirements

Create a formal, testable requirements catalog after the business rules have been reconciled. Assign stable identifiers such as `FR-001`, `FR-002`, etc.

Group functional requirements by:

- Authentication and sessions.
- Authorization and user administration.
- Customer management and identity lookup.
- Employee management.
- Vehicle catalog.
- Sale-register management.
- Strict task sequencing and status changes.
- Notes, record provenance, and audit history.
- Document management.
- Customer portal and milestones.
- Customer notifications.
- Reminders/escalation.
- BI/analytics.
- Exports.
- Access logging.

Each requirement must be testable and specify applicable roles, validation/business rules, and acceptance criteria.

### Non-functional requirements

The application UI must be entirely in **Spanish** for MVP/V1 to minimize scope, while the codebase should not unnecessarily prevent future internationalization.

Define realistic requirements for:

- Security and privacy.
- Performance.
- Availability/reliability.
- Maintainability.
- Scalability appropriate to expected usage.
- Auditability.
- Accessibility.
- Responsive design.
- Data integrity.
- Backup/recovery.
- Observability.
- Usability.

Avoid vague requirements such as “must be fast.” Propose measurable targets but label them as proposed until expected workload and hosting constraints are known.

---

## 18. UX/UI and navigation

Design a professional, modern, responsive interface consistent with Grupo Pana's brand while prioritizing clarity and usability.

### Employee areas to evaluate

- Login and password recovery.
- Sales operations workspace with search/filter/sort/pagination.
- Sale creation and sale detail.
- Task detail/editing.
- Customer management.
- Vehicle catalog and image management.
- Employee and role administration.
- BI dashboard.
- Notifications/reminders.
- Audit/history views and exports where permitted.

### Customer areas to evaluate

- Login, password recovery, and first-login password setup.
- Home/list of the customer's sales.
- Sale details with six-milestone timeline.
- Customer-visible document access.
- Assigned-advisor contact details.
- Account/onboarding states.
- Static avatar selected from local assets based on B2C Male, B2C Female, or B2B Entity.

For each screen specify its purpose, key content, actions, role access, validation, loading/empty/error states, confirmation flows, and responsive behavior. Use interaction patterns that make the active task, progress, overdue status, next step, and required actions easy to understand. Do not begin detailed visual coding before information architecture and user journeys are agreed.

---

## 19. API and architecture design

After domain rules, data model, and permissions are sufficiently stable, define:

- API resources/endpoints and HTTP methods.
- Purpose and access requirements of each endpoint.
- Request/response shapes.
- Validation and business rules.
- Standardized errors.
- Filtering, sorting, and pagination.
- Authentication and authorization.
- Task transitions and strict sequential progression.
- Sale cancellation, reopening, and automatic completion.
- Document upload/download and signed URL flows.
- Notification and scheduler interactions.
- Audit events and idempotency.

Enforce critical rules in the backend/database, not only through UI controls. Validate incoming requests before executing SQL. Use parameterized queries only.

---

## 20. Testing strategy

Define a testing strategy before the implementation grows. Include, as appropriate:

- Unit tests for calculations, validations, and domain rules.
- Integration tests for database-backed flows and APIs.
- Authorization tests for every role and customer data isolation.
- Sequential task progression and invalid-transition tests.
- Unique identifier and amount-reconciliation tests.
- Document upload, validation, privacy, and authorization tests.
- Notification deduplication, retry, and failure tests.
- SLA boundary, escalation, pausing, and reminder-cap tests.
- Authentication, refresh rotation/reuse, logout, token expiry, and password recovery tests.
- UI/component and end-to-end tests for critical user journeys.
- Regression tests for sale completion/reopening, resource conflicts, and immutable historical snapshots.

Every major functional requirement should map to one or more acceptance tests.

---

## 21. Implementation roadmap

The initial preferred sequence is:

1. **Phase 1 — Employee side and core logic:** authentication/authorization, customers/employees, vehicle catalog, sale registers, 13-task linear workflow, typed data, document handling, status/audit history, and essential operational screens.
2. **Phase 2 — Customer side:** customer access isolation, six-milestone experience, customer-visible information/documents, and milestone emails.
3. **Phase 3 — Scheduler and automation:** reminders, escalation, deduplication, notification logs, and task-timing analytics.

Treat this as a starting sequence, not an unquestionable constraint. Recommend changes if dependencies or risks justify them. For each milestone define goals, scope, prerequisites, database/backend/frontend work, tests, and definition of done. Separate MVP, V1, and future enhancements.

---

## 22. Project documentation and decision log

Recommend and maintain useful documentation without documenting for its own sake. Possible artifacts include:

- Root `README.md` and local development setup.
- Product overview and scope.
- Business rules and 13-task specification.
- Functional and non-functional requirements.
- Role-permission matrix.
- UX information architecture and screen flows.
- Architecture diagrams and Architecture Decision Records (ADRs).
- Database schema and ERD.
- API documentation.
- Security/document-access model.
- Testing strategy.
- Deployment/operations guide.
- User/admin guide.
- Changelog.

Keep a decision log containing each major decision, status, reason, alternatives, consequences, and date/version where useful. Relevant decisions include data modeling, authentication/session handling, storage, notification strategy, SLA timing/rollback behavior, milestone rules, and architecture choices.

---

## 23. Target design deliverables

Through our collaborative design phase, iteratively create and refine these 22 artifacts before application implementation begins:

1. Project overview and problem statement.
2. Business/product objectives and proposed success metrics.
3. Scope boundaries (MVP/V1/future), non-goals, and assumptions.
4. Actors and role-permission matrix (RBAC).
5. Sale lifecycle, cancellation rules, and historical snapshot integrity.
6. Complete 13-task operational specification and strict linear state transitions.
7. Six customer-facing milestones and derived-state mapping.
8. Functional and non-functional requirements catalog.
9. Primary domain use cases and user journeys.
10. Document management, storage, and access-authorization strategy.
11. Customer/employee notification engine rules.
12. SLA duration, reminders, and escalation rules.
13. UX information architecture and screen specifications.
14. Relational schema, relationships/cardinalities, constraints, and ERD.
15. REST API endpoints and payload contracts.
16. System architecture, directory structure, and technology selection under cost constraints.
17. Security, privacy, and data-isolation model.
18. BI/analytics specification and KPI definitions.
19. Comprehensive testing strategy.
20. Step-by-step development roadmap.
21. Deployment, infrastructure, and operations strategy.
22. Documentation structure and architectural decision log.

Do not generate all 22 as if they were final on the first turn. The first response has a separate, concrete deliverable requirement below.

---

## 24. First response — baseline project package

**Do not write application code.** Use this prompt as the starting point for product design and baseline project documentation. The first response must be structured into **exactly three top-level parts**, in this order. Use the information provided; mark unresolved details as assumptions/open decisions instead of inventing answers.

### Part 1 — Repository `README.md`

Generate a polished Markdown file called `README.md` for the repository root. It must include:

- Executive overview of the two connected experiences (Employee App and Customer Portal).
- The specified technology stack, clearly distinguishing selected components from any provider limits that still need verification.
- RBAC/user types overview.
- All 13 strictly linear internal tasks and how they map to the 6 customer-facing milestones.
- A concise project status/scope section that distinguishes planned functionality from implemented functionality.

### Part 2 — Formal `PROJECT_SPECIFICATION.tex`

Generate a complete, fully compilable LaTeX source file named `PROJECT_SPECIFICATION.tex`. Transform the prompt's requirements into a formal Software Requirements & Product Specification, removing “instructions to an LLM” language from the document itself.

Use a clean `article` or `report` class, `hyperref`, structured sectioning, readable tables, and appropriate packages. Ensure special characters/underscores are escaped correctly, tables fit page widths, and the source is compilable without relying on unavailable external images or files.

Cover at minimum:

1. Document metadata and executive summary.
2. Business context, problem statement, objectives, scope, assumptions, and non-goals.
3. Actors, roles, RBAC, and authentication.
4. Core domain entities and historical snapshot rules.
5. The complete 13-task operational lifecycle, exact fields, customer visibility, durations, financial reconciliation rules, and linear transitions.
6. Customer portal and six macro-milestones.
7. Document storage/access policy.
8. Notifications, SLA/reminders, and escalation rules.
9. Record provenance, audit events, and access logs.
10. BI/analytics and KPI definitions/candidates.
11. Proposed database model and invariants, with undecided design details labelled appropriately.
12. Proposed architecture and required technology stack.
13. Functional/non-functional requirements, testing strategy, and roadmap.

### Part 3 — Execution Master Plan & High-Impact Decisions

- Map the 22 target deliverables in Section 23 into a step-by-step plan for future turns. Explain the order and dependencies (for example, validate domain rules/schema, then API/auth, then UX flows, then implementation/testing/deployment).
- Identify the most consequential unresolved business or architecture decisions that should be resolved before finalizing the database schema or writing application code.
- Explicitly highlight internal inconsistencies or risks in this prompt, including at least:
  - Exact task rollback/reversion behavior versus the strict linear workflow.
  - How an SLA timer behaves when an in-progress task is reverted to pending and restarted.
  - Customer visibility of sensitive identity/affidavit documents.
  - Temporary-password email versus safer activation-link alternatives.
  - Enforcing series/VIN/license-plate uniqueness only across active/completed sales in a schema where sale state and identifiers may live in different tables.
  - Polymorphic user references in `Refresh_Tokens` and `Access_Logs`.
  - The amount/rounding/mismatch rules and invoice-number uniqueness scope.
  - The best way to retain catalog references (especially selected vehicle color) while preserving immutable sale snapshots.
  - Current provider free-tier quotas/limits, which must be verified before implementation rather than treated as permanent guarantees.
- Do not “resolve” these by guessing. Explain recommended options and mark decisions for confirmation.

If the environment supports creating files, provide actual downloadable `README.md` and `PROJECT_SPECIFICATION.tex` files rather than only describing them. Keep the first response focused on these four parts, and do not start implementing application source code.

---

## Final product principle

The goal is to create a secure, maintainable, professional platform that supports Grupo Pana's endoso operations and gives customers meaningful visibility into their own purchase. It should not become a generic CRUD app, duplicate information unnecessarily, or add infrastructure/features without a clear business or technical reason.
