# Grupo Pana — Endoso Operations & Customer Tracking Platform

## 1. Project mission and your role

Hi! I want you to help me design and plan a substantial software project from the ground up.

Act as my collaborative partner across product discovery, business analysis, UX/UI design, software architecture, database design, backend/API design, security, analytics, testing, and project planning. Bring the perspective of a senior product analyst and software architect, but explain decisions clearly and help me understand the reasoning behind them.

The goal is to design a professional web platform for managing vehicle sales through Grupo Pana's **endoso** sales channel. The platform will have two connected experiences:

1. **An employee application** for managing customers, vehicles, sale registers, the 14-task process, documents, assignments, reminders, and operational analytics.
2. **A customer portal** where customers can securely access their sale registers, follow the process through customer-friendly milestones, and view the information and documents explicitly made available to them.

Do **not** start coding immediately. First, establish a coherent understanding of the product, process, requirements, data, roles, and business rules. Then guide me through UX, data modeling, architecture, technology selection, API design, implementation, testing, and deployment.

The company currently has a basic internal application built with Power Apps and a Power BI dashboard. I will not provide screenshots or detailed documentation of those tools for this exercise. Treat that fact only as background context; **focus on the product described in this prompt, not on recreating an existing system**.

---

## 2. Collaboration principles

Throughout the project, distinguish clearly between:

- **Confirmed requirements and decisions:** Explicitly specified in this prompt.
- **Proposals:** Ideas that should be evaluated rather than automatically implemented.
- **Assumptions:** Temporary assumptions used to make progress.
- **Open questions:** Matters that still require a business decision or further information.
- **Technical recommendations:** Your reasoned recommendations, which are not automatically business requirements.
- **Future enhancements:** Valuable possibilities that should not unnecessarily complicate the first release.

Do not silently turn assumptions into requirements, invent missing business rules, or make a major change to a stated requirement without calling it out. If you detect contradictions, risks, or an idea that may be unnecessarily complex, explain the issue, its implications, and a recommended resolution. Preserve the specified business intent even when you suggest a safer or more maintainable implementation.

Use an iterative approach. Do not produce a giant specification and assume every detail is final. Maintain consistency across:

**business process → business rules → requirements → UX → permissions → data model → API → architecture → implementation → tests.**

When new information arrives, update the relevant artifacts and explain which previous decisions are affected.

---

## 3. Business context and problem

Grupo Pana is a Peruvian automotive company and an official Toyota and Hino dealership. It provides vehicle sales and other automotive services. Within its vehicle sales operations, the company manages sales through a channel known as **endoso**.

An endoso vehicle sale passes through a series of commercial, administrative, financial, documentation, customs, registration, preparation, and delivery activities. These activities require coordination among the customer and Grupo Pana employees. The operation needs to be tracked from the official quotation through vehicle delivery.

The platform should centralize the information needed to manage each operation and make progress easier to understand. It should improve employee workflow and management visibility while giving customers a secure, clear view of the relevant progress of their own purchase.

Potential problem areas include operational coordination, traceability, delays, bottlenecks, document management, customer uncertainty, data quality, and management reporting. Validate and refine these as part of the analysis rather than assuming they are all proven problems.

### Desired outcomes

Help define measurable business and product objectives. Initial candidates include:

- Centralize sale-operation information and documents.
- Improve employee visibility into task status, dependencies, and delays.
- Give customers a secure and understandable way to follow their purchase.
- Improve accountability and auditability for important changes.
- Identify tasks and operations that need attention.
- Provide management with useful operational analytics.
- Reduce avoidable communication and coordination effort.
- Protect customer, employee, financial, and legal information.

Do not treat these examples as automatically approved success metrics. Recommend suitable measures and identify what baseline data would be needed to assess improvement.

### Scope management

Help define what belongs in the MVP, what belongs in the first complete release (V1), what is explicitly out of scope, and what should remain a future possibility. Prevent scope creep and explain dependencies between features.

---

## 4. Product overview

### 4.1 Employee application

Authorized employees should be able to:

- Create and manage customer accounts and customer records.
- Manage employee accounts and roles according to permissions.
- Manage the vehicle catalog, versions, colors, and images.
- Create and manage sale registers, each representing one vehicle sale.
- Assign a sales advisor to each sale register.
- Track the sale through 14 tasks with dependencies and required data.
- Enter task-specific fields and upload required documents.
- Add notes to tasks and sale registers.
- Cancel or reopen sale registers according to permissions.
- Search, filter, sort, and paginate operations and reference data.
- Monitor task deadlines, reminders, and escalations.
- View operational and management analytics through a polished BI dashboard.
- Access appropriate histories, audit records, and exports according to role.

These capabilities are governed by the role-permission matrix in this prompt. Do not assume every employee can perform every action.

### 4.2 Customer portal

Customers should be able to:

- Sign in through a customer-specific login interface.
- View all sale registers associated with their customer record.
- View the vehicle and assigned advisor information specified in this prompt.
- Follow progress through six customer-facing macro-milestones.
- Access only those fields and documents explicitly designated as customer-visible.
- Receive the defined milestone notifications and account emails.
- Reset their password.

Customers must not be able to view or infer another customer's sale registers, documents, or private information.

---

## 5. Sale lifecycle and general business rules

Each sale register represents **exactly one vehicle sale**. If one customer purchases two vehicles, create two independent sale registers. Each has its own vehicle selection, task progress, documents, timeline, notes, and overall state.

A sale register includes:

### Customer reference and historical snapshot

- `customer_id` reference to the customer record.
- A snapshot, captured when the sale is created, of the customer's legal/name value, document type, and document number.
- Historical sale records and snapshots must remain immutable for financial and legal audit purposes, even if the customer profile is updated later.

### Vehicle reference and historical snapshot

- Reference to the selected vehicle/model/version as appropriate.
- Selected color.
- Snapshot of the selected version's reference price at the time the sale is created.

### Other sale information

- Fourteen task records and task-specific data.
- Progress and timeline information.
- Sale temperature: `Hot`, `Warm`, or `Cold`, representing the estimated probability of completion.
- Automatically recorded creation timestamp.
- Overall sale state: `active`, `completed`, or `cancelled`.
- Sale-level notes.
- Assigned sales advisor.

The exact final relational structure should be justified during data modeling; the list above establishes business information that must be represented, not a mandate to create one table per bullet.

### Sale completion and cancellation

- A sale becomes `completed` automatically when all 14 tasks have been completed.
- Employees may cancel a sale or reopen it according to their role and permissions.
- Sales advisors may cancel their own sales, providing a reason, but may not undo a cancellation.
- Sales managers may cancel any sale and undo cancellations.
- Cancelled sales must remain available for historical/audit purposes and must not be physically deleted during ordinary operation.
- System administrators may permanently delete corrupted/test sale records when necessary, subject to careful safeguards and auditability.

If reopening a sale conflicts with the rule that completion is automatic, explain and define the lifecycle behavior without silently changing either requirement.

---

## 6. The 14-task process

The customer may first contact a sales advisor through WhatsApp or telephone and receive an initial, non-final quotation outside this tracked operation. If the customer decides to proceed, the advisor creates the sale register and the formal 14-task process starts with **Task 1: Cotización del Vehículo**, which is the official quotation. Do not add the initial informal quotation as a fifteenth task unless the business requirements later change.

Each task has three statuses:

- `pending`
- `in_progress`
- `completed`

A task may start only after **all of its dependencies** have been completed. Every non-optional field/document listed for a task is required before that task can be completed. Every task must have an optional Notes textarea.

The recommended duration refers to the elapsed time from the task transitioning to `in_progress` until it transitions to `completed`. A task without a specified duration has no predefined recommended duration.

The label **Customer-visible** below means that the data or document should be accessible in the customer portal, subject to secure authorization checks. All uploaded documents must have, at minimum, their file type/MIME type and size in bytes recorded as metadata.

Before a task status is changed, show a confirmation message. This is especially important when completing a task: after a task is marked `completed`, only a Sales Manager or System Admin may undo completion or modify its fields/documents. Sales Advisors may update active, non-completed tasks; completed tasks are read-only to them.

### Task 1 — Cotización del Vehículo

**Purpose:** Prepare the official vehicle quotation in Word and Excel, defining the base price, Grupo Pana commission in percentage and USD, and final vehicle price.

**Fields:**

- Vehicle price before commission, USD — textbox.
- Grupo Pana commission, USD — textbox; automatically recalculated when commission percentage is manually changed.
- Grupo Pana commission, percentage — textbox; automatically recalculated when commission in USD is manually changed.
- Final vehicle price, USD — textbox; calculated as vehicle price before commission plus commission. **Customer-visible.**
- Official vehicle quotation — Word document. **Customer-visible.**
- Official vehicle quotation — Excel document. **Customer-visible.**

**Recommended duration:** None.

**Dependencies:** None.

**Implementation note:** Define reliable handling of decimal precision, currency formatting, rounding, and which field is the source of truth when either commission value is edited. The two commission inputs must not become inconsistent.

### Task 2 — Debida Diligencia del Cliente

**Purpose:** Collect the signer's identity documents and the Customer Knowledge Affidavit, determine PEP status, and record the applicable DDC regime.

**Fields:**

- Signer's identity information. For a Diplomatic customer, the signer is the customer; for an Embassy, Religious Entity, or International Organization, the signer is the representative/executing person:
  - Document type — dropdown: DNI, CE, PAS, CDI. **Customer-visible.**
  - Document number — textbox. **Customer-visible.**
  - Full name — textbox. **Customer-visible.**
  - Scanned identity document — PDF. **Customer-visible.**
- Customer Knowledge Affidavit — PDF. **Customer-visible.**
- Power of Attorney validity document (`Vigencia de Poder`) — PDF, required if `customer.type` is not `Diplomático`. **Customer-visible.**
- PEP status — dropdown: `No PEP`, `PEP`, `Relacionado con PEP`.
- DDC regime — dropdown: `General`, `Reforzado`.

**Recommended duration:** 3 days.

**Dependencies:** Task 1.

**Security note:** The prompt marks some due-diligence files as customer-visible. Evaluate the privacy and business implications of exposing identity documents and due-diligence material, and flag any concern for explicit review; do not silently change the specified visibility.

### Task 3 — Liquidación de Unidad

**Purpose:** Assign the vehicle's unique series/VIN identifier, calculate the amount payable to Toyota, and upload the settlement PDF.

**Fields:**

- Vehicle series number — textbox, unique. **Customer-visible.**
- Amount payable to Toyota — numeric field.
- Settlement document — PDF.

**Recommended duration:** 12 days.

**Dependencies:** Task 2.

### Task 4 — Resumen de Venta

**Purpose:** Consolidate associated costs, including accessory cost, updated commission, and vehicle release processing costs.

**Fields:**

- Accessory amount, USD — numeric field.
- Commission amount, USD — numeric field. It may differ from the commission established in Task 1 due to updated prices in the endoso settlement.
- Vehicle release processing amount, USD — numeric field.
- Sales summary — PDF. **Customer-visible.**

**Recommended duration:** None.

**Dependencies:** Task 3.

### Task 5 — Pago a Grupo Pana

**Purpose:** Verify the customer's payment, recording the bank, transaction date, unique transaction number, amount, and payment voucher.

**Fields:**

- Transaction bank — dropdown, including BCP, BBVA, Scotiabank, Interbank, and other supported banks. **Customer-visible.**
- Transaction date — date. **Customer-visible.**
- Transaction number — textbox, unique. **Customer-visible.**
- Deposited amount, USD — numeric field; expected to match the final vehicle price from Task 1 unless the business defines an exception. **Customer-visible.**
- Payment voucher — PDF. **Customer-visible.**

**Recommended duration:** None.

**Dependencies:** Task 1.

### Task 6 — Pago a Toyota

**Purpose:** Record the internal payment to Toyota, including banking details, proof of payment, and official payment confirmation.

**Fields:**

- Transaction bank — dropdown, including BCP, BBVA, Scotiabank, Interbank, and other supported banks.
- Transaction date — date.
- Transaction number — textbox, unique.
- Deposited amount, USD — numeric field; expected to match the price established in Task 3 unless the business defines an exception.
- Payment voucher — PDF.
- Payment confirmation — PDF.

**Recommended duration:** None.

**Dependencies:** Tasks 3 and 5.

### Task 7 — Facturación

**Purpose:** Record the official invoices for the vehicle, accessories, commission, and vehicle release processing. Each invoice includes its number, date, amount, and PDF file.

**Fields:**

- **Toyota invoice:** number (textbox), date, amount in USD (expected to match the price established in Task 3), PDF file.
- **Accessories invoice:** number (textbox), date, amount in USD (expected to match the amount established in Task 4), PDF file. All four fields are **Customer-visible**.
- **Commission invoice:** number, date, amount in USD (expected to match the amount established in Task 4), PDF file.
- **Vehicle release processing invoice:** number, date, amount in USD (expected to match the amount established in Task 4), PDF file.

**Recommended duration:** None.

**Dependencies:** Tasks 5 and 6.

### Task 8 — Documentos Endosados

**Purpose:** Receive and upload the official endorsed documents needed to continue with customs processing.

**Fields:**

- Endorsed documents — PDF.

**Recommended duration:** 10 days.

**Dependencies:** Task 7.

### Task 9 — Trámite Aduanero

**Purpose:** Manage vehicle nationalization/customs processing, recording the deposit order, DAM number, customs office, control channel, and customs certificate.

**Fields:**

- Deposit order (`Pedido de Depósito`) — PDF.
- Customs Declaration of Goods (DAM) number — textbox.
- Customs office — dropdown populated with available customs offices in Peru.
- Control channel — dropdown: `Verde`, `Naranja`, `Rojo`.
- Customs certificate — PDF.

**Recommended duration:** 12 days.

**Dependencies:** Task 8.

### Task 10 — Trámite de Liberación

**Purpose:** Assign an internal person in charge and track the vehicle's release period.

**Fields:**

- Person in charge — textbox.

**Recommended duration:** 30 days.

**Dependencies:** Task 9.

### Task 11 — Inmatriculación y Placas

**Purpose:** Register the vehicle legally, assign the definitive license plate number, and upload the Electronic Vehicle Identification Card (`TIVe`).

**Fields:**

- License plate number — textbox, unique. **Customer-visible.**
- Registration date — date. **Customer-visible.**
- Electronic Vehicle Identification Card (`TIVe`) — PDF. **Customer-visible.**

**Recommended duration:** 15 days.

**Dependencies:** Task 10.

### Task 12 — Traslado a PDS

**Purpose:** Record the date when the vehicle is transferred to the pre-delivery inspection center.

**Fields:**

- Transfer date — date. **Customer-visible.**

**Recommended duration:** None.

**Dependencies:** Task 11.

### Task 13 — Equipamiento

**Purpose:** Record accessory installation, the service-order number, service-order document, and completion date.

**Fields:**

- Service order number — textbox.
- Service order — PDF.
- Equipment completion date — date. **Customer-visible.**

**Recommended duration:** None.

**Dependencies:** Task 12.

### Task 14 — Entrega de Vehículo

**Purpose:** Coordinate final delivery, recording the optional transfer date to Surquillo, official delivery date, and signed delivery record.

**Fields:**

- Transfer date to Surquillo — date, optional. **Customer-visible.**
- Vehicle delivery date — date. **Customer-visible.**
- Signed vehicle delivery record — PDF. **Customer-visible.**

**Recommended duration:** None.

**Dependencies:** Task 13.

### Task data rules and modeling instructions

- All tasks have optional notes.
- Fields/documents are mandatory unless explicitly marked optional.
- Respect the dependency graph above; a task can start only when all its dependencies are completed.
- Enforce unique constraints for vehicle series, transaction numbers where specified, and license plates.
- Capture task status history, including who changed a status and when.
- Define validations for amounts, dates, identifiers, and required documents.
- Define exactly when task-specific data is editable and how it is protected after completion.
- When reopening a completed task, preserve history and ensure that the sale's automatic completion state is recalculated consistently.
- The Task 1/Task 3/Task 4/Task 5/Task 6/Task 7 amount relationships are stated as expected matches in several places. Do not enforce these as hard financial invariants until exceptions and rounding rules are confirmed; identify them as cross-field business validations to review.
- Recommend a maintainable approach to task-specific data (relational tables, JSON/metadata, or hybrid). Compare the trade-offs before deciding; do not force all task fields into one unstructured JSON field without analysis.

---

## 7. Customer data and customer accounts

### Customer categories

Customers are grouped into B2C and B2B categories.

- **B2C:** Diplomatic customer.
- **B2B:** Embassy, Catholic religious entity, non-Catholic religious entity, and International Organization.

### Identification documents

- **B2C:** DNI, CE, PAS, CDI.
- **B2B:** RUC.

Document type + document number must uniquely identify a customer within the customer table. Preserve leading zeros where applicable; treat document numbers as identifiers, not arithmetic values.

### Customer profile fields

- Customer type.
- Document type.
- Document number.
- First name and last name for B2C individuals.
- Legal name (`Razón Social`) for B2B entities.
- Nationality/country.
- Contact information.
  - For B2B: contact person's first name, last name and job title.
  - For all customers: phone and email.
- Account credentials managed by the authentication system.

### Name lookup

For DNI and RUC records, I would like the system to retrieve the relevant name automatically, with manual entry as a fallback if lookup fails. Candidate approaches include a provider with a free API tier (for example, `https://api-codart.cgrt.org/`) or data lookup services such as `https://eldni.com/pe/buscar-datos-por-dni` and SUNAT's RUC lookup website at `https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp`.

Evaluate these options before recommending an implementation. Consider current availability, terms of service, privacy, reliability, rate limits, cost, security, and legal/ethical implications. Do not recommend scraping a service without checking whether it is appropriate. Provide a manual fallback regardless of the chosen lookup mechanism. Do not assume any stated free-tier quota remains current without verification.

### Customer accounts

- Employees create customer accounts, subject to role permissions.
- The system creates an initial temporary credential and sends an onboarding email to the customer.
- The customer is required to change/set a secure password at first access.
- Customers cannot directly edit their document, name, email, or phone through the portal, to protect contract integrity.
- Customers can reset their passwords.
- Login uses the official identification document, not email, as the primary identifier.

For security, assess whether emailing a temporary password or emailing a short-lived, single-use activation link is safer. Preserve the intended account-onboarding experience, explain the trade-off, and clearly ask for a decision if a security-related change to this specified behavior is recommended. Never store plaintext passwords.

---

## 8. Employee data and employee accounts

Employees have the following profile information:

- Document type: DNI, CE, or PAS.
- Document number.
- First name and last name.
- Nationality/country.
- Gender.
- Profile picture.
- Birthdate.
- Hire date.
- Active/inactive status.
- Role.
- Personal contact: phone and email.
- Business contact: phone and email.
- Authentication credentials managed securely by the authentication system.

Document type + document number must be unique within the employee table.

Employee roles are:

- `System Admin`
- `Sales Manager`
- `Sales Advisor`

Employee access and capabilities must follow the RBAC matrix below.

---

## 9. Vehicle catalog: models, versions, colors, images

The employee application needs a vehicle catalog. A sale selects a model, a version, and a color that is available for that model.

### Vehicle model fields

- Model name.
- Description.
- One or more categories, such as `Camioneta`, `Comercial`, `Familiar`, `Hatchback`, and `Sedan`.
- Available versions.
- Available colors.

### Version fields

- Version name.
- Reference price.
- Active/inactive status or equivalent archival behavior.

### Color and image management

- Available colors may vary by model.
- Upload and replace images for each color.
- Image viewpoints to support:
  - Main view.
  - Exterior front.
  - Exterior left side.
  - Exterior right side.
  - Exterior rear.
  - Interior.
- The main view image should be required. Other viewpoints should be supported, but the exact requirement for every viewpoint should be a configurable/business decision. Display a clean placeholder when an optional image is missing.
- Authorized managers can create/edit models and versions, upload photos, and archive old entries. System Admins have full catalog CRUD. Sales Advisors have read-only access for selecting vehicles.

The catalog and sale-register model must preserve the reference price applicable at the time a sale was created, even if the catalog price later changes.

---

## 10. Customer portal and six macro-milestones

The customer portal is designed to communicate progress clearly without exposing all internal operational complexity.

The customer must be able to view:

- Vehicle model, version, categories, reference price snapshot, selected color, and images.
- Assigned Sales Advisor's full name, contact email, and contact phone number.
- Sale creation timestamp, overall state, and progress timeline.
- The fields/documents explicitly marked customer-visible in the task specification, subject to secure authorization.

### Six customer-facing milestones

1. **Cotización y Documentación** — Groups Tasks 1 and 2. Establishes the official quotation and validates the signer's identity documentation.
2. **Asignación y Pago** — Groups Tasks 3, 4, and 5. Confirms physical vehicle assignment by series number, consolidates the Sales Summary, and enables the customer payment to Grupo Pana.
3. **Facturación Oficial** — Groups Tasks 6 and 7. Confirms Toyota payment processing and issuance of the official invoices for the vehicle/accessories and related concepts.
4. **Trámites Aduaneros** — Groups Tasks 8 and 9. Indicates that endorsed documents have been processed and the vehicle is in the customs/nationalization process.
5. **Liberación y Placas** — Groups Tasks 10 and 11. Communicates the release period and progress toward registration and definitive license-plate assignment.
6. **Preparación y Entrega** — Groups Tasks 12, 13, and 14. Covers the move to pre-delivery inspection, equipment/accessory installation, and final delivery coordination.

Use these six milestones as the customer's main progress experience. Keep the internal 14-task workflow as the employee-facing operational model. If internal progress and customer milestone state need different rules, design an explicit mapping rather than conflating them.

Customer-visible fields/documents must be enforced server-side, not only hidden in the frontend. Flag privacy concerns about any marked item without silently changing its visibility.

---

## 11. Customer email notifications

The notification strategy should keep customers informed without sending an email for every internal task transition. Notifications are tied to high-value events, required actions, and meaningful milestones.

### Notification 1 — Account creation (once per customer)

- **Trigger:** A Sales Advisor registers the customer for the first time.
- **Subject:** `Bienvenido a Grupo Pana - Acceso a tu portal de seguimiento`
- **Content:** Welcome message, customer portal link, login identifier (document type/number), and temporary credential or secure activation instructions. Require password setup/change at first access.

### Notification 2 — Sale register created

- **Trigger:** A Sales Advisor creates a sale register and assigns the vehicle to the customer.
- **Subject:** `Hemos registrado tu nueva solicitud de vehículo`
- **Content:** Confirm that the process has started; include vehicle model/color, assigned advisor's name and WhatsApp/contact number, and a link to view Phase 1 in the portal.

### Notification 3 — Official quotation available

- **Trigger:** Task 1 is completed.
- **Subject:** `Tu cotización oficial está lista para revisión`
- **Content:** Tell the customer the official vehicle quotation is available and link to download the Word and Excel files from the authenticated portal.

### Notification 4 — Sales summary available

- **Trigger:** Task 4 is completed.
- **Subject:** `Siguiente paso: Tu resumen de venta ha sido generado`
- **Content:** Tell the customer that the Sales Summary is available, provide the assigned vehicle series, and communicate the exact amount to deposit to Grupo Pana.

### Notification 5 — Invoices issued

- **Trigger:** Task 7 is completed.
- **Subject:** `Tus comprobantes de pago han sido emitidos`
- **Content:** Confirm that the relevant payment/invoicing steps have been recorded and the customer-visible invoices are available for download through the portal.

### Notification 6 — Customs processing begins

- **Trigger:** Task 8 is completed.
- **Subject:** `Iniciamos los trámites aduaneros de tu vehículo`
- **Content:** Explain that the endorsed documents have been processed and customs/nationalization procedures are underway, setting expectations without promising an unsupported delivery date.

### Notification 7 — License plate assigned

- **Trigger:** Task 11 is completed.
- **Subject:** `¡Tu vehículo ya cuenta con placa oficial!`
- **Content:** Provide the definitive license plate number and a secure link to download the customer-visible TIVe PDF.

### Notification 8 — Final vehicle preparation

- **Trigger:** Task 12 is completed.
- **Subject:** `Tu vehículo está en fase de preparación final`
- **Content:** Inform the customer that the vehicle has entered the pre-delivery preparation/equipment phase before final delivery.

### Notification 9 — Delivery completed

- **Trigger:** Task 14 is completed.
- **Subject:** `¡Felicidades por tu nuevo vehículo! / Gracias por confiar en Grupo Pana`
- **Content:** Thank the customer, confirm the delivery date, and provide a secure portal link to the signed vehicle delivery record PDF.

Notifications should use reliable event handling: avoid sending duplicate messages if a task transition is retried, a scheduler runs more than once, or an event is replayed. Store delivery attempts and outcomes, and do not attach sensitive documents directly to email when a secure authenticated download link is more appropriate.

---

## 12. Employee task reminders, deadlines, and escalation

A server-side scheduled process should evaluate tasks with a recommended duration and issue reminders/escalations according to the following intended rules.

### Due-date calculation

- Calculate the task due timestamp when the task transitions from `pending` to `in_progress` by adding the recommended duration to that start timestamp.
- Use strict elapsed calendar time; weekends and non-business hours do not pause the clock.
- Example: a three-day task started Friday at 4:00 PM is due Monday at 4:00 PM.
- Tasks without a recommended duration do not receive these duration-based reminders unless another rule is defined.

### Approaching-due warning

- Send one `Approaching Due` warning when 80% of the recommended duration has elapsed.

### Escalation and recipients

- **Level 1 — Warning through 24 hours overdue:** Notify the assigned Sales Advisor.
- **Level 2 — 24 to 48 hours overdue:** Escalate to the Sales Manager.
- **Level 3 — More than 48 hours overdue:** Escalate to the System Admin and visually highlight the task in the UI.
- Do not automatically unlock or reassign a task because it is overdue.

### Recurring reminders

Reminder frequency should depend on the recommended task duration. Shorter tasks should receive more frequent overdue reminders because their duration is proportionally more critical; longer tasks can use a wider interval. Implement a hard cap on recurring reminders. The exact intervals and cap should be proposed and confirmed before implementation.

### Deduplication state

Track at least:

- `last_reminder_sent_at` — timestamp.
- `current_reminder_phase` — `approaching`, `overdue`, or `recurring`.
- `recurring_reminder_count` — integer.

Record every dispatched reminder in an append-only `Notification_Log` (or equivalent audit table) for accountability and analytics.

### UI and analytics

- Show visible indicators for `Approaching`, `Overdue`, and `Escalated/Recurring` tasks.
- Provide quick filters for urgent tasks.
- Store `completion_phase` when a task is completed so reporting preserves whether completion was `early`, `in_approaching`, `overdue`, or `recurring_overdue`.

---

## 13. File and document management

Tasks can require Word, Excel, and PDF files. Design a secure file-management flow that supports:

- File upload, validation, and secure storage.
- File type/MIME type and size in bytes for every upload.
- Original file name, upload timestamp, uploader, and task/sale association, as appropriate.
- Replacement behavior and version history where needed.
- Deletion/deactivation rules and audit history.
- Maximum file size and allowed file formats.
- Role-based upload, update, and download permissions.
- Explicit customer visibility per field/document.
- Authenticated or time-limited access to private files.
- Safe behavior if a stored file is missing or unavailable.

Do not expose private documents simply because someone knows the URL. Evaluate how signed URLs, private assets, and backend authorization work with the selected provider. The database should normally store file metadata and storage references rather than binary file contents, but justify the final design.

Cloudinary is one candidate because it is part of my initial stack preference, not a fixed decision. Evaluate its suitability for confidential identity, due-diligence, financial, and legal documents. If it is unsuitable for some document classes, recommend an appropriate alternative or a separated storage policy.

---

## 14. BI dashboard and analytics

Create a polished, useful BI dashboard inside the employee application. Do not add charts merely to make the dashboard look impressive. Start from the decisions that each role must make and select metrics that help with those decisions.

Potential questions and analytics include:

- How many active, completed, and cancelled operations exist?
- Which tasks are approaching their due dates, overdue, or escalated?
- Where are the biggest bottlenecks?
- How much time is spent in each task and across the complete operation?
- How do operations and completions trend by month?
- How many operations are in each of the six customer-facing macro-milestones?
- Which vehicle models, versions, colors, and customer categories are most common?
- How many active operations are assigned to each advisor?
- What does each advisor's active pipeline and workload look like?
- What are task completion performance and operation completion times?
- How many operations are cancelled and why?
- What is the progression/conversion rate, and how is it defined?
- Which operations need attention today?
- What useful, authorized billing/commission indicators can be derived from fields recorded in the system?

Potential filters include date period, sale state, customer type, entity/customer, vehicle model/version, color, assigned advisor, sale temperature, and urgency/overdue state. Define each KPI precisely, including numerator, denominator, time period, and inclusion/exclusion rules. Avoid presenting a metric unless the underlying data supports it. Clearly differentiate amounts recorded in the system from recognized revenue or accounting facts that the application may not be able to verify.

Dashboard visibility must follow roles:

- System Admin: global operational/system views.
- Sales Manager: global business and operational views.
- Sales Advisor: individual view of their own pipeline and permitted metrics.

Recommend the simplest maintainable BI implementation that satisfies the product's needs. It need not be a separate analytics platform unless justified.

---

## 15. Roles and role-based access control (RBAC)

Use the following three employee roles as the initial role model. Preserve the intended permissions, but point out any security or operational concern and propose a controlled resolution if necessary.

| Module / feature             | System Admin                                                                                            | Sales Manager                                                                                    | Sales Advisor                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Staff user management        | Full CRUD: create staff, assign roles, reset passwords, and permanently delete when genuinely necessary | View active staff, limited to Sales Advisors, for reassignment purposes                          | No access                                                                                    |
| Vehicle catalog              | Full CRUD                                                                                               | Create/edit models, upload photos, archive old models/versions                                   | View only; browse/select vehicles for a sale                                                 |
| Customer database            | Full CRUD, including exceptional permanent deletion                                                     | View/edit/create any customer; no hard delete                                                    | Create customers; edit/view only customers associated with their own sales                   |
| Sale registers               | Full CRUD; permanently delete corrupted/test records under controlled conditions                        | View all, reassign advisors, cancel any sale, undo cancellations                                 | Create/update/cancel own sales with a required cancellation reason; cannot undo cancellation |
| Tasks and documents          | Full access for exceptional administrative/technical intervention                                       | Override tasks across all sales, including editing/replacing files and reopening completed tasks | Update own active tasks; completed tasks are read-only                                       |
| BI dashboard                 | Global view                                                                                             | Global business/operational view                                                                 | Individual view of own pipeline and permitted performance metrics                            |
| Raw data exports (CSV/Excel) | Full-system export where needed, including audit/access logs                                            | Business exports: global customer list, sales registers, task audit logs, cancellation logs      | No raw data exports                                                                          |

### Permission design requirements

- Enforce authorization on the backend/API, not only in the frontend.
- Use least privilege by default.
- Separate the ability to view a record from the ability to modify it, cancel it, reopen it, export it, or delete it.
- Log security-sensitive actions, overrides, cancellations, role changes, and exceptional deletions.
- Treat a Sales Advisor's access as limited to their own assigned/created sales as specified above; define whether reassignment changes access immediately.
- Clarify and safeguard the System Admin's powerful destructive permissions. Prefer soft deletion/archive for ordinary operations and require audit trails/confirmation for permanent removal.
- Customers are an additional access class and must only access their own records and customer-visible content. They are not included in the employee RBAC table.

---

## 16. Authentication and session management

### Separate login interfaces

Provide two distinct login interfaces and routes, for example:

- Employee login: `/admin` or another appropriate employee-facing route.
- Customer login: `/portal`.

These interfaces are separated for user experience and routing. Do not assume that separate login pages alone provide security; enforce identity, role, user type, and resource authorization in the backend.

### Login fields

Email is **not** the login identifier. Both login pages require:

1. Document type dropdown.
2. Document number text field.
3. Password field.
4. `Olvidé mi contraseña` link.
5. `Mantener sesión iniciada` checkbox.

Customer document-type options: DNI, CE, RUC, PAS, CDI.

Employee document-type options: DNI, CE, PAS.

Validate document format dynamically based on the selected type (for example, DNI is typically eight digits and RUC eleven digits), but keep these validation rules configurable and validate on the server as well as the client.

### Identity uniqueness

- Enforce a composite unique constraint on `(document_type, document_number)` in the `Customers` table.
- Enforce a composite unique constraint on `(document_type, document_number)` in the `Employees` table.
- Normalize document type and document number consistently before uniqueness checks while preserving meaningful leading zeros.
- A document identifier may theoretically appear in both tables if a person is both a customer and an employee; define how the authentication system distinguishes account types and prevent cross-portal authorization leaks.

### Sessions and tokens

The initial authentication preference is:

- Short-lived JWT access tokens.
- Long-lived refresh tokens stored in HTTP-only cookies.
- A `Remember Me` option.

Assess the full implementation for security, including `Secure` and `SameSite` cookie flags, refresh-token rotation/revocation, CSRF protection where applicable, logout invalidation, session expiration, and safe storage of access tokens. Do not treat JWT alone as a complete authentication/session strategy.

### Access logs

Create an append-only `AccessLogs` table for authentication events. Log:

- `user_type` (`Employee` or `Customer`).
- Attempted `document_type` and `document_number`.
- `user_id` when authentication succeeds and an account is identified.
- `action_type`: `LOGIN_SUCCESS`, `LOGIN_FAILED`, or `LOGOUT`.
- `ip_address`, where available and reliably obtained.
- Timestamp.

Log successful login, failed login attempts (including incorrect credentials or unknown document identifiers), and explicit logouts. Protect the logs from ordinary user modification/deletion and define retention/access policies. Avoid unnecessarily storing secrets or passwords in logs.

---

## 17. Security and privacy

Security is a first-class requirement. Evaluate at least:

- Authentication and secure password hashing.
- Backend authorization and role-based access control.
- Customer record isolation and prevention of insecure direct-object references.
- Document and download authorization.
- Session and token management.
- File upload validation and storage privacy.
- Server-side input validation.
- Rate limiting and protection against brute-force login attempts.
- Sensitive data exposure in logs, API responses, and analytics.
- Audit trail integrity.
- Protection against common web vulnerabilities.
- Backup, recovery, and appropriate data retention.
- Access restrictions for personally identifiable information and due-diligence/financial/legal documents.

A customer must never gain access to another customer's sale or document by guessing a URL, record identifier, or file reference. A frontend visibility flag is not an authorization mechanism. Avoid storing plain-text passwords or secrets. Evaluate applicable Peruvian privacy/legal considerations where relevant, and clearly distinguish technical advice from legal advice that requires professional validation.

---

## 18. Initial technology-stack preference (not a final decision)

I have experience with the JavaScript version of this stack and suspect TypeScript may be a good choice for a project of this size. Treat the following as an initial preference to evaluate, not as a fixed requirement:

- **Frontend:** React with TypeScript.
- **Backend:** Node.js with Express and TypeScript.
- **Database:** PostgreSQL.
- **Authentication:** JWT access tokens with refresh-token handling as described above.
- **File storage:** Cloudinary, subject to the security/privacy suitability analysis.

Compare realistic alternatives only where comparison would help make a decision. Base recommendations on maintainability, developer experience, development speed, cost, hosting, free-tier limitations, security, ecosystem maturity, PostgreSQL support, background jobs, private document storage, deployment, and future evolution. Do not choose technologies simply because they are popular. Verify current hosting/provider limits and pricing when that information affects the recommendation.

---

## 19. Architecture and database design

Do not finalize architecture or schema until the business rules, entities, status transitions, permissions, file flows, and reporting requirements are sufficiently understood.

### Architecture topics

Evaluate the need for:

- React frontend.
- Backend/API.
- PostgreSQL database.
- Authentication and authorization components.
- Private file storage.
- Email service.
- Background scheduler/job runner.
- Notification delivery/audit mechanism.
- Analytics and dashboard queries.
- Logging, monitoring, backups, and deployment.

Prefer the simplest architecture that meets the requirements and can be maintained by the project team. Avoid unnecessary microservices or infrastructure unless there is a concrete reason.

### Database design topics

Consider entities/structures for:

- Customers.
- Employees.
- Credentials/accounts/session or refresh-token records.
- Roles/permissions if required beyond a fixed role enum.
- Vehicle models, versions, categories, colors, and images.
- Sale registers and customer/vehicle snapshots.
- Task definitions and per-sale task instances.
- Task dependencies and status history.
- Task-specific data.
- Documents, metadata, versions, and visibility.
- Notes.
- Notifications and notification logs.
- Reminder tracking and completion phase.
- Access logs.
- Sale cancellation/reopening history.
- Other justified domain entities.

Provide primary keys, foreign keys, uniqueness constraints, indexes, relationships/cardinalities, integrity rules, and an ERD. Explain key modeling decisions. Do not create a table merely because a concept has a name; justify the need for each entity. Preserve the historical snapshot rules for customer and vehicle price information.

---

## 20. Requirements specification

Create a structured requirements catalog after the business domain has been analyzed.

### Functional requirements

Assign stable IDs such as `FR-001`, `FR-002`, etc. Group them by:

- Authentication and sessions.
- Authorization and user administration.
- Customer management.
- Employee management.
- Vehicle catalog.
- Sale-register management.
- Task and dependency management.
- Notes and history.
- Document management.
- Customer portal.
- Email notifications.
- Reminders/escalations.
- BI/analytics.
- Exports.
- Audit/access logging.

Each requirement should be testable and include relevant permissions and acceptance criteria.

### Non-functional requirements

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

Avoid vague requirements such as “must be fast” without a way to evaluate them. Identify performance targets as proposed targets until the expected workload is known.

---

## 21. UX/UI and navigation

Design a professional, modern, responsive interface that feels appropriate for Grupo Pana's brand while prioritizing clarity and usability.

Determine the information architecture, navigation, user journeys, and screen specifications for the appropriate areas. Candidate employee areas include:

- Login and password recovery.
- Sales operations workspace.
- Sale register creation and details.
- Task detail/editing.
- Customer management.
- Vehicle catalog and image management.
- Employee/role administration.
- BI dashboard.
- Notifications/reminders and audit/history views as appropriate.

Candidate customer areas include:

- Login and password recovery.
- Customer home/list of their sales.
- Sale details and six-milestone timeline.
- Customer-visible document access.
- Advisor contact information.
- Account/onboarding states.

For every screen, describe its purpose, key content, primary actions, role access, validation, loading/empty/error states, and responsive behavior. Use UX patterns that make the current task, task progress, delays, next steps, and required actions easy to understand. Do not begin detailed visual implementation before the information architecture and user journeys are agreed.

---

## 22. API design

After the domain model and permissions are stable, define the API resources and endpoints. Document:

- Endpoint and HTTP method.
- Purpose.
- Authentication requirements.
- Authorization rules.
- Request/response structure.
- Validation and business rules.
- Error handling.
- Filtering, sorting, and pagination.
- Task status transitions and prerequisite enforcement.
- Document upload/download flow.
- Notification and scheduler interactions.
- Audit events.

Make sure backend logic—not only UI controls—enforces task requirements, task dependencies, uniqueness, sale lifecycle, roles, and document visibility.

---

## 23. Testing strategy

Define a testing strategy before implementation becomes large. Consider:

- Unit tests for validations and business rules.
- Integration tests for database-backed flows and APIs.
- Authorization tests for each role and customer data isolation.
- Task dependency and status-transition tests.
- Document access and upload-validation tests.
- Notification deduplication/retry tests.
- Reminder/escalation boundary tests.
- Authentication, token expiry, refresh, logout, and password-recovery tests.
- UI/component and end-to-end tests for critical user journeys.
- Regression tests for sale completion/reopening and immutable snapshots.

Every major functional requirement should be traceable to one or more acceptance tests.

---

## 24. Implementation roadmap

Plan development in increments with working software at each milestone. The initial preferred high-level sequence is:

1. **Phase 1 — Employee side: core logic and data production.** Implement authentication/authorization, reference data, customers, employees as appropriate, vehicle catalog, sale registers, the 14 tasks, dependencies, documents, status history, and essential operational views.
2. **Phase 2 — Customer side: data consumption and visualization.** Implement the customer portal, customer access isolation, six-milestone progress experience, customer-visible information/documents, and milestone emails.
3. **Phase 3 — Scheduler and notifications: automation.** Implement reminders, escalation, deduplication, notification logs, and analytics for task timing.

Treat this sequence as a starting point. Recommend changes if dependencies or risk indicate a better order, and explain why. For each milestone, identify its goal, scope, prerequisites, database/backend/frontend tasks, tests, and definition of done.

Separate:

- **MVP:** Minimum useful end-to-end product.
- **V1:** First complete production-oriented release.
- **Future enhancements:** Features that can wait without undermining the core workflow.

---

## 25. Documentation and decision log

Recommend a useful, maintainable documentation structure rather than documenting everything for its own sake. Candidate documents include:

- README and local development setup.
- Product overview and scope.
- Business-process and task specification.
- Functional/non-functional requirements.
- Role-permission matrix.
- UX information architecture and screen flows.
- Architecture decisions and diagrams.
- Database model and ERD.
- API documentation.
- Security and document-access model.
- Testing strategy.
- Deployment/operations instructions.
- User/admin guide.
- Changelog.

Maintain an explicit decision log for major decisions. Record each decision's status, rationale, alternatives, consequences, and date/version where useful. Examples include authentication/session design, storage provider, task data modeling, notification strategy, task timing rules, and architecture choices.

---

## 26. Project and GitHub repository naming

Recommend names for the product and source-code repository. Keep these as separate decisions; they do not have to match.

### Product/project name

Suggest a range of names that are professional, easy to pronounce and remember, appropriate for an automotive-business platform, and potentially suitable if the project grows beyond a university prototype. Include a mix of descriptive names, brand-oriented names, and modern product/SaaS-style names. Names may relate to endoso, operations, workflow, visibility, vehicle delivery, or tracking. Explain the reasoning and possible drawbacks of each. Do not assume the product name must include “Grupo Pana.”

### GitHub repository name

Suggest concise names in lowercase kebab-case that are easy to type and remain appropriate if the product name changes. Avoid unnecessarily long names. Consider whether the repository should be a monorepo or eventually split into repositories, but do not overcomplicate the initial structure without a reason.

### Internal codename

Optionally suggest one or two short internal codenames if they help during development.

At the first stage, provide a shortlist and a recommendation for both the product name and repository name. Do not claim that a domain name, GitHub repository name, trademark, or brand is available unless you verify it.

---

## 27. Initial analysis deliverables

Before implementation, help create a coherent project specification containing, as appropriate:

1. Project overview and problem statement.
2. Business/product objectives and proposed success metrics.
3. Scope, non-goals, and assumptions.
4. Actors and role-permission matrix.
5. Sale lifecycle and business rules.
6. The complete 14-task specification and dependency graph.
7. Customer-facing six-milestone model.
8. Functional and non-functional requirements.
9. Use cases and important user journeys.
10. Document/storage/access strategy.
11. Customer and employee notification rules.
12. Reminder and escalation rules.
13. UX information architecture and screen specifications.
14. Database model and ERD.
15. API design.
16. System architecture and technology-stack decision.
17. Security and privacy model.
18. BI/analytics specification and KPI definitions.
19. Testing strategy.
20. MVP/V1/future roadmap.
21. Deployment strategy.
22. Documentation structure and decision log.
23. Recommended product and repository names.

Treat the list as a target for the design process, not a requirement to generate all documents in the first response.

---

## 28. First task — begin the project

**Do not write code yet. Do not ask me to provide screenshots of the existing tools; this prompt is the starting point for the product design.**

Start by analyzing the information in this prompt and provide:

1. A concise but complete summary of the product and its intended users.
2. A classification of the stated information into confirmed requirements, proposals, assumptions, and open questions.
3. The core business entities and main lifecycle concepts you infer, without designing the final database yet.
4. A review of the 14 tasks and dependency graph, identifying contradictions, missing rules, or risky assumptions. Pay particular attention to the reminder timing definition, task visibility/privacy, the amount cross-checks, task completion/reopening, notification triggers, account onboarding/security, the login-identifier mismatch in the onboarding email, and the relationship between task dependencies and customer-milestone progression.
5. The most important unresolved decisions that must be made before detailed architecture/database work, ranked by impact.
6. A recommendation for the first concrete artifact to create with me and why it should come first.
7. A shortlist of product names and GitHub repository names, with one recommendation for each.
8. A practical next-step plan for continuing iteratively.

Do not attempt to solve every open question by guessing. Where a decision is needed, explain the alternatives and recommend a direction when enough information exists. Ask only the most important next question, if a question is necessary to proceed; otherwise, make the best supported start using this specification.

The goal is to design a secure, maintainable, professional product that supports Grupo Pana's endoso operations and gives customers meaningful visibility into their purchase—not to create a generic CRUD app or to replicate an existing tool.
