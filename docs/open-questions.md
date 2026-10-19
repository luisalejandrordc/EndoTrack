# Open questions

Should the Task 1 include this?

- Will customer be in charge of the vehicle release processing? — yes/no checkbox; **Customer-visible.**
  What implications will it have that the customer chooses to be in charge of the vehicle release processing?
- Automatic reminders to employees should be disabled for Tasks 7, 8 and 9? Also for Task 10?

En el excel hay un registro con encargado de tarea 10.3 como TLI y encargado de tarea 10.4 como cliente realiza su propio tramite, does it make sense?

- La comisión como porcentaje se calcula en función al precio del vehículo pagado a toyota? o al total incluyendo accesorios y tramite de liberación?
- Hay un campo en el power apps para subir el link de documentos endosados, es solo un archivo o son varios? Que tipo de archivo? Por qué demora 10 días?
- Que significa PDS? Es Punto de Servicio? Solo existe uno o hay multiples opciones? Si es asi podria agregarlo a la tarea de "Traslado a PDS".
- En la base de datos (Excel) había un campo de "Link_Detalle_Equipamiento", recuerdas de qué es? si es distinto al de orden de servicio?
- Encargado/Gestor: TLI or Beagle, en qué tarea se incluye? Podrías explicarmelo de nuevo please :c (en la base de datos aparece como encargado de la tarea 10.3 con opciones TLI y SIN ASIGNAR)
- En la base de datos, aparece un campo de encargado de la tarea 10.4 donde aparecen opciones como CÁRITAS (GUSTAVO QUINCHO), OLDER VALLEJOS, o CLIENTE REALIZA SU PROPIO TRÁMITE. Podrías explicarme esto de nuevo también please? :c
- Estos son campos extras en la base de datos que no los entiendo bien:
  - LINK_EXPEDIENTE GENERADO POR CANCILLERIA
  - LINK_NOTA PROTOCOLAR
  - LINK_RESOLUCIÓN ( ENT-RELIGIOSA)
  - LINK_DUA (ABC)
  - LINK_LEVANTE DE UNIDAD
- Me explicas el Trámite de Liberación por favor? Veo en mis apuntes de la última reu que se solicitan dos documentos, pero no recuerdo de qué, además del "encargado".
- **Which fields and documents should be visible to the customer?**

Boleta -> Diplomatico, Factura -> los demás

Create the most important UML diagrams.

### LLM detected

Assumptions:

§16.10 (portal_type + two nullable FKs + CHECK) supersedes §14.4’s user_type/user_id wording.
§11’s rules are the SLA rule: reopen keeps due_date, restart recalculates it. These supersede the earlier “specify before implementation” note.
Task definitions and recommended durations live in a reference table, as §16.2 invites.

Open questions:

Each has a Rec (my recommendation).

A. Contradictions and inconsistencies
Password hashing. §14.3 says bcrypt, §15 says Argon2id. Rec: Argon2id, with parameters tuned to the free Render instance’s memory.
★ Refresh-token design. §14.3 and §15 name one Refresh_Tokens table, but §16.8–16.9 define two. The cleanup job names only the first. Neither version has rotation or reuse-detection fields (token family, revoked/replaced timestamps, remember-me flag), though §20 tests reuse. Rec: keep two tables with real FKs, clean up both, and add those fields.
★ Managers and sale creation/editing. The matrix gives Managers view, reassign, cancel and undo-cancel, but not create or edit. Can Managers or Admins create sales, and for which advisor? Which sale fields can an advisor edit after creation?
★ Editing completed tasks vs derived money. §5.2 lets Managers and Admins edit a completed task without reverting it. But Task 3’s commission derives from Task 1 amounts, and Tasks 4–6 are checked against Tasks 1 and 3. Editing Task 1 amounts after Task 3 completes would silently break those values. Rec: block edits to financial source fields while any downstream task is completed (roll back in reverse order). Allow other edits with a Reason for Edit.
★ Reopen vs “one in_progress”. Reopening task N while N+1 is in_progress creates two active tasks. Rec: allow reopening only when no task is in_progress. Also, §5.2’s sentence about reverting to pending is garbled. Confirm that data and files entered stay (read-only) rather than being cleared.
★ SLA state on reopen, restart and cancel. Do reminder counters and phase reset on restart? Rec: yes. On reopen? Rec: no, so the cap isn’t re-armed. When a cancelled sale is reopened, do SLA clocks resume with remaining time (Rec) or keep the original due_date, so cancelled time counts as delay?
“Generated PDFs” (§4.7). Nothing in the spec generates PDFs, since all PDFs are uploads. Is this a leftover, or are reports and receipts planned?
Notification scope. §3.2 promises “account and milestone notifications” but §10 defines email only. Confirm email-only for MVP/V1. Notification 1 is triggered by “a Sales Advisor”, yet Managers and Admins can also create customers. Rec: trigger on account creation by any actor.
B. Business rules and workflow
★ Who starts tasks? §5.1 implies a manual start with confirmation. That makes waiting time between tasks invisible to SLAs and bottleneck analytics. Rec: keep manual start, but record when each task became eligible.
★ Cancellation. Is it allowed at any stage, including after money moved (Tasks 4–5)? Is it blocked from completed? Should reasons be a controlled category plus text, given the BI wants “for what reasons”? Is a reason required to reopen? Do customers see cancelled sales or get notified? Rec: category plus text stored as first-class sale fields, not only in the audit log. Require a reopen reason. Keep the reason internal.
★ Vehicle changes and snapshot scope. Can model, version or color change after creation? Rec: no. Cancel and recreate, or allow a Manager-only audited correction before Task 3. Also, Task 2’s Vigencia de Poder depends on customer type, which isn’t snapshotted. Rec: snapshot customer_type; keep categories and catalog images live. Who sets sale temperature, and is it defined by percentage ranges?
★ Amount reconciliation. Only Task 4 has a Mismatch Reason. For Task 5 vs Task 3 and for the Task 6 invoices, should a mismatch block completion, warn, or require a reason? Is each payment a single deposit? Is it USD only? Does IGV treatment affect invoice amounts versus the quote components? Rec: use the Mismatch-Reason mechanism everywhere an amount is “expected to match”, with exact matching, single deposit, and USD only.
★ Zero amounts. If accessories, release processing or commission is 0, are the matching Task 6 invoice and the Task 12 service order still mandatory? Rec: explicit “not applicable” for those items only. The 13 tasks always remain.
★ Uniqueness scope. Series, VIN and plate are freed on cancellation. Should bank + transaction number and invoice numbers behave the same way? Are Task 4 and Task 5 transaction numbers one uniqueness space or two? Is the DAM number unique? What normalization applies (case, spaces, hyphens)?
★ Controlled lists. I need the initial banks and customs offices, and who maintains them. Is Task 9’s “person in charge” free text or an employee? I also need the full document-type set (e.g. Task 5’s “Payment confirmation” isn’t in §16.4’s examples) and whether a type can hold several files (e.g. Task 7’s “Endorsed documents”).
Validation rules. I need formats for DNI/CE/PAS/CDI/RUC (length, charset, RUC checksum), VIN and Peruvian plates. Also: are future dates allowed, is there cross-task date ordering, and what are the money limits? Rec: hard-block impossible values and soft-warn on out-of-order dates.
DDC/PEP. Does PEP, Relacionado con PEP or Reforzado trigger a block, approval or alert, or is it only recorded? Is there a compliance role outside the three?
★ What customers see, and when. Should customer-visible data appear only after a task is completed, or live while in_progress? How should reversals show (progress moving backward)? Rec: only completed tasks’ data, with regressions shown honestly.
Advisor contact exposure. Is it business email and phone only? Notification 2 mentions WhatsApp, but Employees has no such field. Should customers be told when the advisor changes? Rec: business contact only, and add a WhatsApp field.
★ Customer accounts. Does a B2B entity share one login among its contacts? There is no active/archived flag, so how is portal access disabled? Is email required and unique? Rec: add an active flag; email required, not unique.
★ Advisor access to customers. A customer an advisor just created has no assigned sale, so the advisor would lose access instantly. What should an existing-customer lookup reveal to an unlinked advisor? Rec: the creator keeps access until the first sale or a short window. Reveal the legal name only, and rate-limit and log lookups.
★ Employee lifecycle. The spec has no employee onboarding flow, no must_change_password on Employees, and no forgot-password channel (business or personal email?). What happens when you deactivate an advisor with active sales? Rec: block until reassigned. Can there be several Admins, and is the last active Admin protected from deactivation or self-demotion?
Audit visibility and permanent deletion. Who sees which history? Should exports be audit-logged? They are missing from §16.11’s enum. Rec: yes. For “controlled conditions” on hard delete, Rec: only test or corrupted sales that never reached delivery, with second-Admin confirmation, and audit rows must survive. Records with history are deactivated, not deleted.
Retention and privacy law. What retention periods apply to identity documents, invoices and logs? How do data-subject requests under Peru’s data-protection law interact with the delete restrictions? This needs legal input. The 500 MB tier also forces log-retention limits.
C. Security and authentication
Temporary password by email (§6.4, Notification 1). Emailing a plaintext password is weak. Rec: use a single-use, short-lived activation link. If you keep the temp password, define its expiry (e.g. 72 h) and a resend policy.
Auth policy gaps. Login throttling and lockout are unspecified, as are generic error messages. Rotation resets 30 days each time, so there is no absolute session limit. The server-side lifetime for non-“remember me” sessions is undefined. Two tabs refreshing at once can cause a false reuse detection. Role and deactivation changes could stay stale for up to the 15-minute JWT lifetime. Rec: lockout after repeated failures, and an absolute maximum session (your call on the length). Also check active status and role in the DB on every request, and revoke refresh tokens on deactivation or password reset.
Codart API. I need its documentation, auth method, quota, terms and sample responses. It is a third-party source of personal data, so is it approved by Grupo Pana and legal? Lookups cover DNI and RUC only, so CE, PAS and CDI are always manual. Does it also prefill Task 2 signer names? Rec: log lookups, rate-limit per user, and mark names “looked up” vs “manually entered”.
D. Platform and free-tier risks (items marked “verify” are from memory and I’ll confirm them in a spike)
★ Cross-site refresh cookie (potential blocker). The static site and API will sit on different onrender.com subdomains. I believe browsers treat those as cross-site (verify), so the HttpOnly cookie would need SameSite=None, which browsers increasingly block. It would also need CSRF defense. The options are:
(a) proxy /api through the static site’s rewrite rules to make it same-origin;
(b) a shared custom domain;
(c) a different token strategy.
Rec: test (a) first. Either way this touches §14.3, so I need your approval. Do you have a Grupo Pana domain we could use?
Render free tier and production plan. Free services sleep when idle (verify), which affects demos, first logins and cron-job.org’s request timeout. That is fine for development. When does zero-cost end, and what is the production budget? Please share the expected workload (employees, concurrent users, sales per month, documents per sale, file sizes) so I don’t guess the NFR targets.
★ Scheduler and reminders.
(a) Twice-daily cron against a 12-hour cadence and a 57.6 h warning on Task 2 means reminders can arrive up to a run late. Rec: an hourly trigger with idempotent evaluation.
(b) Is there a first “overdue” notice at due_date, and does “first overdue recurring reminder” mean count 1? What happens after the cap of 6: silence, or UI highlight only?
(c) Do Level 2 and 3 go to all active Managers and Admins? Is the advisor copied? What if none exist?
(d) What are the completion_phase boundaries? Rec: compute them from timestamps, not from reminders actually sent.
Email. Resend needs a verified sending domain. Who controls DNS for Grupo Pana’s domain? Without it we can only send tests to the account owner. The free tier may also have a daily cap (I recall about 100/day; verify), which matters for reminder volume. Rec: non-production environments must never email real addresses.
R2. It may require a payment method on file even for the free allowance (verify). Is that compatible with “zero cost”? Public r2.dev URLs are meant for development, so production public images need a custom domain. §15 treats profile images as public, which would expose employee photos. Rec: public only for catalog images, with employee photos private and signed. Do uploads stream through Go or use presigned URLs? What are the maximum size and allowed formats, and is malware scanning needed?
Supabase.
(a) Tables are exposed through its auto-generated API by default. Only Go touches the DB, so Rec: disable that API and apply deny-all RLS on every table.
(b) Connection mode: pooler vs direct, IPv6, and prepared statements with pgx behind a transaction pooler.
(c) There is no managed point-in-time recovery on the free tier (verify), but the NFRs need backup and recovery. Rec: a scheduled pg_dump to R2 from a free GitHub Actions job.
(d) The 500 MB cap against audit, access and notification log growth.

Two minor items: the Chi import should be go-chi/chi/v5, and the Codart and Resend URLs in §6.3 and §15 have broken Markdown formatting, so please confirm the real base URLs.
