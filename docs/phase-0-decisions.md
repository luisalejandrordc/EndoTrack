# Phase 0 — Decisions

These are the decisions made based on the open questions and edge-cases detected by the LLM during the project's Phase 0.

### A. Contradictions and inconsistencies

1. **Password hashing.** Use Argon2id with parameters tuned to the free Render instance's memory.
2. **Refresh-token design.** Keep two tables for `refresh_tokens` with real FKs. The cleanup job must clean both of them. Add rotation and reuse-detection fields (token family, revoked/replaced timestamps, remember-me flag).
3. **Managers and sale creation/editing.** Managers and admins can create sales and assign an advisor to them at creation. When an advisor creates a sale, they get automatically assigned to it.
4. **Editing completed tasks vs derived money.** Block edits to financial source fields while any dependent task is completed. Require downstream tasks to be rolled back in reverse order before editing. Allow other edits with a Reason for Edit.
5. **Reopen vs “one `in_progress`”.** Allow reopening only when no task is `in_progress`. After a task gets reverted to `pending` its data and files entered stay (read-only) rather than being cleared.
6. **SLA state on reopen, restart and cancel.** Reset reminder counters and SLA phases on task restart. Preserve them on reopen so the reminder cap isn’t re-armed. When reopening a cancelled sale, resume SLA clocks with the remaining time rather than counting cancelled time as delay.
7. **PDF generation** Treat PDF generation as a future enhancement, not part of the current scope. All PDFs in the initial release are uploaded documents.
8. **Notification scope.** Limit notifications to email for MVP/V1. Trigger Notification 1 whenever an account is created, regardless of whether the actor is a Sales Advisor, Manager, or Admin.

### B. Business rules and workflow

9. **Who starts tasks?** §5.1 implies a manual start with confirmation. That makes waiting time between tasks invisible to SLAs and bottleneck analytics. **Rec:** keep manual start, but record when each task became eligible.
10. **Cancellation.** Is it allowed at any stage, including after money moved (Tasks 4–5)? Is it blocked from `completed`? Should reasons be a controlled category plus text, given the BI wants “for what reasons”? Is a reason required to reopen? Do customers see cancelled sales or get notified? **Rec:** category plus text stored as first-class sale fields, not only in the audit log. Require a reopen reason. Keep the reason internal.
11. **Vehicle changes and snapshot scope.** Can model, version or color change after creation? **Rec:** no. Cancel and recreate, or allow a Manager-only audited correction before Task 3. Also, Task 2’s `Vigencia de Poder` depends on customer type, which isn’t snapshotted. **Rec:** snapshot `customer_type`; keep categories and catalog images live. Who sets sale temperature, and is it defined by percentage ranges?
12. **Amount reconciliation.** Only Task 4 has a Mismatch Reason. For Task 5 vs Task 3 and for the Task 6 invoices, should a mismatch block completion, warn, or require a reason? Is each payment a single deposit? Is it USD only? Does IGV treatment affect invoice amounts versus the quote components? **Rec:** use the Mismatch-Reason mechanism everywhere an amount is “expected to match”, with exact matching, single deposit, and USD only.
13. **Zero amounts.** If accessories, release processing or commission is 0, are the matching Task 6 invoice and the Task 12 service order still mandatory? **Rec:** explicit “not applicable” for those items only. The 13 tasks always remain.
14. **Uniqueness scope.** Series, VIN and plate are freed on cancellation. Should bank + transaction number and invoice numbers behave the same way? Are Task 4 and Task 5 transaction numbers one uniqueness space or two? Is the DAM number unique? What normalization applies (case, spaces, hyphens)?
15. **Controlled lists.** I need the initial banks and customs offices, and who maintains them. Is Task 9’s “person in charge” free text or an employee? I also need the full document-type set (e.g. Task 5’s “Payment confirmation” isn’t in §16.4’s examples) and whether a type can hold several files (e.g. Task 7’s “Endorsed documents”).
16. **Validation rules.** I need formats for DNI/CE/PAS/CDI/RUC (length, charset, RUC checksum), VIN and Peruvian plates. Also: are future dates allowed, is there cross-task date ordering, and what are the money limits? **Rec:** hard-block impossible values and soft-warn on out-of-order dates.
17. **DDC/PEP.** Does `PEP`, `Relacionado con PEP` or `Reforzado` trigger a block, approval or alert, or is it only recorded? Is there a compliance role outside the three?
18. **What customers see, and when.** Should customer-visible data appear only after a task is `completed`, or live while `in_progress`? How should reversals show (progress moving backward)? **Rec:** only completed tasks’ data, with regressions shown honestly.
19. **Advisor contact exposure.** Is it business email and phone only? Notification 2 mentions WhatsApp, but `Employees` has no such field. Should customers be told when the advisor changes? **Rec:** business contact only, and add a WhatsApp field.
20. **Customer accounts.** Does a B2B entity share one login among its contacts? There is no active/archived flag, so how is portal access disabled? Is email required and unique? **Rec:** add an active flag; email required, not unique.
21. **Advisor access to customers.** A customer an advisor just created has no assigned sale, so the advisor would lose access instantly. What should an existing-customer lookup reveal to an unlinked advisor? **Rec:** the creator keeps access until the first sale or a short window. Reveal the legal name only, and rate-limit and log lookups.
22. **Employee lifecycle.** The spec has no employee onboarding flow, no `must_change_password` on `Employees`, and no forgot-password channel (business or personal email?). What happens when you deactivate an advisor with active sales? **Rec:** block until reassigned. Can there be several Admins, and is the last active Admin protected from deactivation or self-demotion?
23. **Audit visibility and permanent deletion.** Who sees which history? Should exports be audit-logged? They are missing from §16.11’s enum. **Rec:** yes. For “controlled conditions” on hard delete, **Rec:** only test or corrupted sales that never reached delivery, with second-Admin confirmation, and audit rows must survive. Records with history are deactivated, not deleted.
24. **Retention and privacy law.** What retention periods apply to identity documents, invoices and logs? How do data-subject requests under Peru’s data-protection law interact with the delete restrictions? This needs legal input. The 500 MB tier also forces log-retention limits.

### C. Security and authentication

25. **Temporary password by email (§6.4, Notification 1).** Emailing a plaintext password is weak. **Rec:** use a single-use, short-lived activation link. If you keep the temp password, define its expiry (e.g. 72 h) and a resend policy.
26. **Auth policy gaps.** Login throttling and lockout are unspecified, as are generic error messages. Rotation resets 30 days each time, so there is no absolute session limit. The server-side lifetime for non-“remember me” sessions is undefined. Two tabs refreshing at once can cause a false reuse detection. Role and deactivation changes could stay stale for up to the 15-minute JWT lifetime. **Rec:** lockout after repeated failures, and an absolute maximum session (your call on the length). Also check active status and role in the DB on every request, and revoke refresh tokens on deactivation or password reset.
27. **Codart API.** I need its documentation, auth method, quota, terms and sample responses. It is a third-party source of personal data, so is it approved by Grupo Pana and legal? Lookups cover DNI and RUC only, so CE, PAS and CDI are always manual. Does it also prefill Task 2 signer names? **Rec:** log lookups, rate-limit per user, and mark names “looked up” vs “manually entered”.

### D. Platform and free-tier risks (items marked “verify” are from memory and I’ll confirm them in a spike)

28. **Cross-site refresh cookie (potential blocker).** The static site and API will sit on different `onrender.com` subdomains. I believe browsers treat those as cross-site (verify), so the HttpOnly cookie would need `SameSite=None`, which browsers increasingly block. It would also need CSRF defense. The options are:

    - (a) proxy `/api` through the static site’s rewrite rules to make it same-origin;
    - (b) a shared custom domain;
    - (c) a different token strategy.

    **Rec:** test (a) first. Either way this touches §14.3, so I need your approval. Do you have a Grupo Pana domain we could use?

29. **Render free tier and production plan.** Free services sleep when idle (verify), which affects demos, first logins and cron-job.org’s request timeout. That is fine for development. When does zero-cost end, and what is the production budget? Please share the expected workload (employees, concurrent users, sales per month, documents per sale, file sizes) so I don’t guess the NFR targets.
30. **Scheduler and reminders.**
    - (a) Twice-daily cron against a 12-hour cadence and a 57.6 h warning on Task 2 means reminders can arrive up to a run late. **Rec:** an hourly trigger with idempotent evaluation.
    - (b) Is there a first “overdue” notice at `due_date`, and does “first overdue recurring reminder” mean count 1? What happens after the cap of 6: silence, or UI highlight only?
    - (c) Do Level 2 and 3 go to all active Managers and Admins? Is the advisor copied? What if none exist?
    - (d) What are the `completion_phase` boundaries? **Rec:** compute them from timestamps, not from reminders actually sent.
31. **Email.** Resend needs a verified sending domain. Who controls DNS for Grupo Pana’s domain? Without it we can only send tests to the account owner. The free tier may also have a daily cap (I recall about 100/day; verify), which matters for reminder volume. **Rec:** non-production environments must never email real addresses.
32. **R2.** It may require a payment method on file even for the free allowance (verify). Is that compatible with “zero cost”? Public `r2.dev` URLs are meant for development, so production public images need a custom domain. §15 treats profile images as public, which would expose employee photos. **Rec:** public only for catalog images, with employee photos private and signed. Do uploads stream through Go or use presigned URLs? What are the maximum size and allowed formats, and is malware scanning needed?
33. **Supabase.**
    - (a) Tables are exposed through its auto-generated API by default. Only Go touches the DB, so **Rec:** disable that API and apply deny-all RLS on every table.
    - (b) Connection mode: pooler vs direct, IPv6, and prepared statements with pgx behind a transaction pooler.
    - (c) There is no managed point-in-time recovery on the free tier (verify), but the NFRs need backup and recovery. **Rec:** a scheduled `pg_dump` to R2 from a free GitHub Actions job.
    - (d) The 500 MB cap against audit, access and notification log growth.
