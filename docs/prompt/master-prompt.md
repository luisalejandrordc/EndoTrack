# Grupo Pana - Endoso Operations & Customer Tracking Platform

Hi! I want you to help me design and plan a relatively large software project from the ground up.

I am going to give you everything I currently know about the project: the business context, the existing process, the current internal application, the current BI dashboard, ideas for the new application, questions I have, and decisions that have not yet been made.

I will also provide reference files containing screenshots/material from the systems currently used by Grupo Pana.

Your role is to act as a:

- Senior Product Analyst
- Business Analyst
- Software Architect
- Database Architect
- UX/UI Designer
- Backend/API Architect
- Security/Authorization consultant
- BI/Analytics consultant
- Technical Project Planner

The objective at this stage is NOT to start coding immediately.

First, I want us to understand the business problem correctly, model the process, define requirements and business rules, clarify open questions, and design the product.

Only after those foundations are sufficiently clear should we move into database design, architecture, technology selection, API design, and implementation planning.

---

# 1. Core principle

I do not want this project to become a web-based copy of the existing Power Apps application.

The existing Power Apps application and BI dashboard should be treated as:

> Reference material for understanding the current business process, terminology, workflows, information, and reporting needs.

They are NOT automatically the specification for the new system.

For every important existing feature, ask:

- What business problem does this solve?
- Is it actually useful?
- Is there a better way to implement it?
- Should it remain?
- Should it be redesigned?
- Should it be removed?
- Does it belong in the employee application, customer application, or both?

The objective is to design a better system, not simply reproduce the current one.

---

# 2. How I want you to analyze information

Throughout the project, clearly distinguish between:

### Confirmed facts

Information that is explicitly known about the current business or system.

### Proposed ideas

Ideas that I am considering but that have not yet been validated.

### Open business decisions

Questions that Grupo Pana or the relevant users need to answer.

### Assumptions

Things that we temporarily assume so we can continue designing.

### Technical decisions

Implementation choices that should be made only after the business requirements are sufficiently clear.

### Future possibilities

Ideas that could be useful later but should not unnecessarily complicate the initial version.

Do not silently convert assumptions into requirements.

Do not invent missing business rules.

When information is missing, explicitly identify it and explain why it matters.

When I suggest something that may be unnecessarily complex, challenge it and explain the trade-offs.

When you believe something important is missing, point it out.

---

# 3. Current-system reference materials

I have provided two reference documents.

## 3.1 Existing Power Apps application

The current internal application contains screens/functions that include, among other things:

- Welcome/landing screen.
- Active/in-progress sales listing.
- Completed sales listing.
- Filtering and searching.
- Customer registration.
- Sale registration.
- Vehicle/model selection.
- Color selection.
- Customer information.
- Sale classification/evaluation.
- Detailed sale view.
- 16-task process visualization.
- Task-specific detail/editing.
- Notes.
- Task timing information.
- Specific task management such as vehicle-series assignment.

These screens should help us understand the current workflow, information used by employees, and existing terminology.

However, do NOT assume that the current navigation, categories, layout, or interaction patterns are the correct UX for the new system.

---

## 3.2 Existing BI dashboard

The current BI material shows that the operation is already analyzed through multiple dimensions.

Examples include:

- Total records.
- Sales in process.
- Vehicles.
- Delivered sales/units.
- Projections.
- Accumulated commission.
- Funnel/status categories.
- Task status across the 16 tasks.
- Vehicle/model distribution.
- Operational summary tables.
- Billing/invoicing information.
- Monthly activity.
- Filters by year.
- Filters by month.
- Filters by entity.
- Filters by model.
- Filters by assigned series.
- Filters by customer type.
- Filters by general status.

Some of the current funnel/status terminology includes concepts such as:

- En Trámite
- Gestión de Facturación
- Unidad Entregada
- En Equipamiento
- En Proceso de Entrega

The dashboard also shows operational concepts such as the active/latest task, task start date, ideal task time, and task state distribution across the 16 tasks.

These should be treated as evidence of existing business/reporting concepts, not necessarily as the final information architecture of the new dashboard.

In particular, determine which of these concepts should:

- Remain.
- Be redesigned.
- Be renamed.
- Be replaced.
- Be calculated differently.
- Be removed.
- Be added to.

Also distinguish between information that is genuinely useful for decision-making and information that exists simply because the current dashboard happens to display it.

---

# 4. Business context

Grupo Pana is a Peruvian automotive company that operates as an official Toyota and Hino dealership, providing vehicle sales, after-sales services, maintenance, spare parts, and corporate mobility solutions.

Within its vehicle sales operations, Grupo Pana also manages vehicle sales through different channels. One of these is the "endoso" sales channel.

The endoso channel involves a particular type of vehicle sale in which an operation goes through a specialized sequence of administrative, financial, commercial, and documentation-related stages.

Because each operation involves multiple stages and coordination between Grupo Pana employees and the customer, tracking the progress of an operation can become difficult.

The project I have in mind is a web application that centralizes these operations and provides two main experiences:

### Employee / Grupo Pana side

Employees should be able to:

- Create and manage employees.
- Create and manage customers.
- Create and manage cars models.
- Create and manage sale operations.
- Track progress through the 16 tasks.
- Enter task-specific information (could be simple data like text, numbers, or dates, or even document uploads and management for certain tasks).
- Update the state of each of the 16 tasks (respecting the correspondent prerequisites and data requirements).
- Add notes for each sale operation.
- Search/filter/sort operations for employees, customers, cars models, and sale operations.
- Access operational analytics and a beautiful BI dashboard.
- Receive useful reminders/notifications.

Notice that some of these actions may be reserved to certain roles. I haven't thought too much about it yet. But it is probably recommendable to add them, please tell me what you think about this.

### Customer side

Customers should be able to:

- Log in.
- See their vehicle sale operations.
- See meaningful progress information.
- Access information and documentation that Grupo Pana chooses to expose.
- Receive meaningful updates.

The customer-facing tracking experience is one of the main improvements over the existing system.

---

# 5. Problem statement

We need to define the problem rigorously rather than assuming it is simply:

"Grupo Pana needs a better web application."

The real problem may involve several dimensions:

- Internal operational tracking.
- Visibility across a long multi-stage process.
- Coordination between employees.
- Traceability.
- Delays and bottlenecks.
- Customer uncertainty about progress.
- Fragmented communication.
- Document management.
- Reporting.
- Management visibility.
- Data quality.
- Process standardization.

Analyze the actual problem and help formulate a professional problem statement.

---

# 6. Project objectives

Help define both:

## Business objectives

Examples:

- Improve operational visibility.
- Improve customer transparency.
- Reduce uncertainty.
- Improve traceability.
- Detect delays and bottlenecks.
- Centralize information.
- Improve management reporting.
- Improve data quality.

## Product objectives

Examples:

- Provide a reliable employee workspace.
- Provide a customer tracking portal.
- Provide secure document access.
- Provide operational dashboards.
- Provide task-level traceability.
- Provide role-based access.

Do not assume that all examples above must become final objectives.

---

# 7. Scope

Define:

### In scope

Capabilities that belong in the initial product.

### Out of scope

Capabilities that are intentionally excluded.

### Future scope

Features that could be implemented later.

Help prevent scope creep.

---

# 8. Main business process

A potential customer contacts a Grupo Pana sales advisor, primarily through WhatsApp or telephone, showing interest in purchasing a vehicle through the endoso channel.

The operation then reaches the first stage: preparing and sending an initial quotation.

Some time may pass while the customer evaluates the proposal.

If the customer decides to proceed, the sales advisor prepares an updated/final quotation.

The first two known tasks are approximately:

1. Enviar Cotización
2. Cotización Oficial

Afterward, the operation progresses through a sequence of 16 tasks (including those two mentioned).

**The complete specifications of those 16 tasks are not yet available.**

Do not invent them.

---

# 9. The 16-task process

Each sale consists of 16 tasks/stages.

The current system shows tasks including:

1. Enviar Cotización
2. Cotización Oficial
3. DJ UIF
4. Adjudicación de Series
5. Liquidación Endoso
6. Resumen de Venta (ACC, COM, TL)
7. Pago Cliente a GP
8. Pago a TDP
9. Facturación
10. Documentos Endosados
11. Trámite Aduanero (P DEP. y CERT. AD)
12. Trámite de Liberación
13. Inmatriculación-Placas
14. Traslado a PDS
15. Equipamiento
16. Entrega de Vehículo

These names come from the current process/reference material.

Treat them as the current known task sequence, but allow us to validate, rename, regroup, split, or otherwise improve the modeling when we obtain more information.

For every task, I eventually want to define:

- Name.
- Description.
- Purpose.
- Responsible role.
- Required fields.
- Optional fields.
- Data types.
- Validation rules.
- Required documents.
- Optional documents.
- Task dependencies.
- Recommended duration.
- Deadline logic.
- Allowed statuses.
- Who can edit it.
- Who can complete it.
- Who can reopen it.
- Whether the customer can see it.
- Customer-facing representation.
- Notification rules.

Create a formal task specification matrix once enough information is available.

---

# 10. Task dependencies and exceptional progression

Tasks normally follow a logical sequence.

However, some later tasks may occasionally be completed before one or more earlier tasks.

Therefore, the system should not necessarily enforce a simplistic rule such as:

"Task N cannot be completed until Task N-1 is complete."

Instead, analyze a more robust model involving:

- Recommended order.
- Prerequisites.
- Hard dependencies.
- Soft dependencies.
- Exceptional overrides.
- Override permissions.
- Audit trail.
- Warnings.

Do not assume that all 16 tasks form a strict linear state machine.

---

# 11. Sale register

Each sale register currently represents exactly one vehicle sale.

A customer purchasing two vehicles would normally have two independent sale registers.

Each register has its own:

- Vehicle.
- Progress.
- 16 tasks.
- Status.
- Timeline.
- Documents.
- Notes.
- Assigned sales advisor.

Evaluate whether there is any business reason to support a higher-level "purchase/order" entity grouping multiple sale registers in the future, but do not introduce this complexity unless there is a real need.

---

# 12. Customer model

A customer currently needs information such as:

- Document type.
- Document number.
- Name / legal name.
- Customer type.
- Contact person.
- Phone.
- Email.

For RUC customers, the relevant name is the legal entity name.

For DNI/CE/Passport customers, the relevant name is the person's name.

Document type + document number should uniquely identify the customer.

We need to determine:

- Can customers edit their own information?
- Can employees edit it?
- Who creates customers?
- Who creates customer accounts?
- Can customers create their own accounts?
- How are accounts activated?
- Can customers reset passwords?
- Can a customer have multiple sale registers?
- Should historical sales preserve historical customer data?
- Which customer fields belong to the customer entity versus the sale entity?
- What happens when contact information changes?

---

# 13. Vehicle/model catalog

A sale contains vehicle/model information.

The vehicle model should determine which colors are available.

I am considering a dedicated vehicle catalog section where authorized employees can:

- Create models.
- Edit models.
- Deactivate models.
- Manage colors.
- Upload model images.
- Replace images.

We need to determine whether images should be:

- One image per model.
- One image per color.
- Multiple images per model.
- Another structure.

The system should support a professional visual representation of vehicle models.

---

# 14. Sale classification

The current operation includes a sales classification such as:

- Hot.
- Warm.
- Cold.

This represents probability/priority of completion.

Determine:

- Whether this concept should remain.
- Whether this classification could be modified.
- Who can change it.
- Whether customers should ever see it.
- Whether it should affect reminders or prioritization.
- How it should appear in analytics.

---

# 15. Sale lifecycle

Separate the lifecycle of the overall sale from the status of individual tasks.

A possible sale lifecycle is:

- Active.
- Completed.
- Cancelled.

A cancelled operation should remain stored for historical purposes rather than being physically deleted.

Determine:

- When a sale becomes Completed.
- Whether completion is automatic.
- Whether an employee can manually complete it.
- Who can cancel it.
- Whether a cancelled operation can be reopened.
- Whether completed operations can be reopened.
- What happens when a completed task is changed.

---

# 16. Audit trail and history

The system should probably maintain a history of important changes.

At minimum, consider:

- Task state changes.
- Sale status changes.
- Assignment changes.
- Important field modifications.
- Document uploads/replacements/deletions.
- Permission-sensitive actions.

For state changes, consider recording:

- Previous state.
- New state.
- User.
- Date/time.
- Reason/comment where applicable.

Analyze whether a proper audit/history architecture is needed instead of storing only the latest state.

---

# 17. Dates and business periods

Every sale naturally has a creation timestamp.

However, the business may define a different event as the relevant "sale date" for reporting.

We need to determine:

- What date defines the month/year of a sale?
- Is it quotation date?
- Customer confirmation?
- Vehicle assignment?
- Billing?
- Completion?
- Delivery?
- Another business event?

This is important because it affects BI, filters, monthly reporting, and performance metrics.

Do not assume the answer.

---

# 18. Employee experience

The employee application should probably include areas such as:

### Authentication

Secure employee login.

### Operations

A primary operations workspace containing:

- Search.
- Filters.
- Sorting.
- Pagination.
- Status.
- Customer.
- Model.
- Advisor.
- Classification.
- Dates.
- Progress.
- Current task.

### Customers

Customer management and associated sales.

### Vehicle catalog

Vehicle model/color management.

### Employees

Employee and role management.

### Operation detail

Complete sale overview.

### Task detail

Task-specific information and state management.

### BI

Operational and management analytics.

These are candidate areas, not final UI requirements.

---

# 19. Existing "Proyecciones / Asignadas / En Proceso" categorization

The current application uses categories such as:

- Proyecciones
- Asignadas
- En Proceso

These appear to relate partly to the number/state of completed tasks.

Do not automatically reproduce these categories.

Analyze whether they represent:

- A genuine business concept.
- A useful workflow segmentation.
- A prioritization mechanism.
- A legacy UI solution.

Consider alternatives such as:

- Overall sale status.
- Current task.
- Progress percentage.
- Sale classification.
- Deadline/overdue state.
- Filters.
- Saved views.

The final design should represent the underlying business need, not merely the existing interface.

---

# 20. Operation detail page

The operation detail page should provide a strong overview of:

- Customer.
- Vehicle.
- Assigned advisor.
- Classification.
- Sale status.
- Dates.
- Progress.
- 16 tasks.
- Task states.
- Task timing.
- Documents.
- Notes.

The interface should immediately communicate:

- Where the operation is.
- What is completed.
- What is currently active.
- What remains.
- What is delayed.
- What may be blocked.

Consider timeline, stepper, progress, cards, or another appropriate UX pattern.

---

# 21. Task detail page

Each task can have a different data model.

For example, "Adjudicación de Series" currently includes information such as:

- Vehicle series.
- Vehicle/model information.
- Color.
- Relevant customer information.
- Task status.

Other tasks may require:

- Dates.
- Text.
- Numbers.
- Dropdowns.
- Boolean values.
- Multiple related values.
- Documents.

The architecture must accommodate task-specific data without becoming an unmaintainable collection of hard-coded exceptions.

When I provide the full 16-task specification, determine whether task-specific data should be represented through:

- Dedicated relational structures.
- A flexible metadata/JSON approach.
- A hybrid approach.
- Another model.

Explain the trade-offs before choosing.

---

# 22. Customer experience

The customer should have a much simpler experience than the employee.

The customer should not automatically see every internal field simply because the employee sees it.

Design a deliberate customer-facing information model.

Potential information may include:

- Vehicle.
- Overall progress.
- Current stage.
- Completed milestones.
- Next relevant step.
- Selected dates.
- Quotations.
- Customer-accessible documents.
- Important messages.

Potentially hidden information may include:

- Internal notes.
- Internal classifications.
- Sensitive operational information.
- Internal administrative details.
- Employee-only task information.

Evaluate whether the customer should see:

### Option A

All 16 tasks.

### Option B

A simplified 3–5 stage customer journey.

### Option C

A simplified progress summary with optional access to selected detailed milestones.

Analyze the UX and information-security implications of each approach.

---

# 23. Customer notifications

We need to avoid overwhelming customers with one email per internal event.

Potential strategies include:

- Major milestone notifications.
- Grouped progress updates.
- Notifications when important documentation becomes available.
- Notifications when customer action is required.
- Optional notification preferences.
- Periodic progress summaries.

Define notifications around meaningful customer events rather than exposing every internal workflow transition.

---

# 24. Employee reminders and automation

The current concept includes automated reminders when a task approaches or exceeds its recommended completion period.

Potential implementation:

A server-side scheduled process periodically evaluates operations and sends reminders.

We need to define:

- Which tasks have time targets.
- What "ideal" means.
- When something becomes overdue.
- Who gets notified.
- Reminder frequency.
- Escalation rules.
- How duplicate reminders are prevented.
- Whether reminder status itself should be recorded.

---

# 25. File and document management

Some tasks require document uploads.

Determine:

- Which tasks require files.
- Which file formats are allowed.
- Maximum size.
- Multiple files or one file.
- Versioning.
- Replacement.
- Deletion.
- Audit history.
- Access permissions.
- Customer visibility.
- Secure download/access mechanisms.
- Storage architecture.

The database should generally store document metadata/references rather than large binary content, but evaluate the architecture based on the actual deployment environment.

Security is essential.

A user should not gain access to a private document merely by obtaining its URL.

---

# 26. BI and analytics

The current BI dashboard is an important reference.

It currently contains concepts such as:

- Overall operational KPIs.
- Status/funnel distribution.
- 16-task state distribution.
- Current/last active task.
- Task ideal duration.
- Vehicle/model distribution.
- Summary tables.
- Billing-related information.
- Projection-related information.
- Monthly trends.
- Filtering dimensions.

Use this as a starting point for discovering reporting needs, not as a dashboard specification.

The new BI experience should be based on actual questions and decisions.

For example:

- How many active operations exist?
- How many are delayed?
- Where are the bottlenecks?
- How long does each operation take?
- How long does each task take?
- Which advisors manage the most operations?
- Which advisors have the highest workload?
- Which models are most common?
- Which customer types are most common?
- How many operations are completed?
- How many are cancelled?
- What is the conversion/progression rate?
- How are operations changing over time?
- Which tasks generate the largest delays?
- Which operations require attention today?

These are examples, not final requirements.

Do not add metrics merely because they look impressive.

Every KPI should ideally answer a real business question.

---

# 27. Roles and authorization

Possible roles include:

- Customer.
- Sales advisor.
- Operational employee.
- Supervisor/manager.
- Administrator.

These are preliminary.

Define:

- Roles.
- Permissions.
- Data visibility.
- Creation rights.
- Modification rights.
- Deactivation rights.
- Approval rights.
- Task override rights.
- Document access.
- BI access.

Create a role-permission matrix.

Also evaluate whether a person may have multiple roles.

---

# 28. Security

Security is a first-class requirement.

Analyze:

- Authentication.
- Authorization.
- Role-based access control.
- Resource-level authorization.
- Customer data isolation.
- Document access.
- Session management.
- Password handling.
- Audit logging.
- Sensitive data exposure.
- Input validation.
- API authorization.
- File authorization.
- Common web vulnerabilities.

Especially ensure that customer A can never access customer B's operations or documents by guessing identifiers or URLs.

---

# 29. Recommended architecture

Do not decide the technology stack yet.

First understand:

- Business process.
- Requirements.
- Data model.
- Authorization.
- File management.
- Notifications.
- BI.

Only then recommend an architecture.

The architecture may include:

- Frontend.
- Backend/API.
- Relational database.
- Authentication layer.
- Authorization layer.
- File storage.
- Background jobs/scheduler.
- Notification service.
- Analytics layer.
- Deployment environment.

Explain why each component exists.

---

# 30. Technology-stack selection

Only after the architecture is understood, recommend technologies.

Evaluate options based on:

- Development speed.
- Maintainability.
- Cost.
- Hosting.
- Free-tier feasibility.
- Security.
- Ecosystem.
- Developer experience.
- Database support.
- File storage.
- Background jobs.
- Future scalability.
- Ease of deployment.
- Long-term maintainability.

Do not select a technology simply because it is popular.

Compare realistic alternatives where appropriate.

---

# 31. Database design

Only after the business model is sufficiently clear, design the database.

Identify:

- Users.
- Roles.
- Permissions.
- Customers.
- Employees.
- Vehicle models.
- Vehicle colors.
- Sale registers.
- Tasks.
- Task states.
- Task-specific data.
- Documents.
- Notes.
- Notifications.
- Audit/history.
- Other required entities.

Then define:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Indexes.
- Relationships.
- Cardinalities.
- Important validation rules.

Produce an ERD and explain the important design decisions.

Do not create tables merely because they sound conceptually nice.

---

# 32. Functional requirements

Convert the final business requirements into formally structured requirements.

Use IDs such as:

- FR-001
- FR-002
- FR-003

Group them into areas such as:

- Authentication.
- Authorization.
- Customer management.
- Employee management.
- Vehicle management.
- Sale management.
- Task management.
- Documents.
- Notifications.
- Customer portal.
- BI.
- Administration.
- Audit.

---

# 33. Non-functional requirements

Define requirements for:

- Security.
- Performance.
- Availability.
- Reliability.
- Maintainability.
- Scalability.
- Auditability.
- Accessibility.
- Responsive design.
- Data integrity.
- Backup/recovery.
- Observability.

Do not invent unrealistic enterprise-level requirements for the project's actual scale.

---

# 34. UX/UI design

Create a complete information architecture before detailed implementation.

Define:

- Main navigation.
- Employee navigation.
- Customer navigation.
- Page hierarchy.
- Main user journeys.
- Important workflows.
- Empty states.
- Loading states.
- Error states.
- Confirmation states.
- Permission-denied states.

The design should feel professional and modern while preserving recognizable Grupo Pana branding.

Do not allow branding requirements to compromise usability.

---

# 35. API design

Once the domain model is sufficiently clear, define:

- Resources.
- Endpoints.
- Request/response structures.
- Authentication.
- Authorization.
- Validation.
- Error handling.
- Pagination.
- Filtering.
- Sorting.
- File-upload flow.
- State transitions.
- Audit mechanisms.

---

# 36. Implementation strategy

Finally, divide the project into:

## MVP

Minimum functionality required to demonstrate a complete and genuinely useful solution.

## V1

The first complete production-oriented version.

## Future enhancements

Features that are useful but should not complicate the initial implementation unnecessarily.

For every implementation milestone, define:

- Objective.
- Features.
- Database work.
- Backend work.
- Frontend work.
- Testing.
- Dependencies.

---

# 37. Project naming

I would also like your help choosing the project's name.

Recommend several names for:

## Product / project name

The name should be:

- Professional.
- Appropriate for an automotive company.
- Easy to pronounce.
- Easy to remember.
- Appropriate for an internal business platform.
- Potentially suitable if the project grows beyond the university prototype.

Do not rely entirely on "Grupo Pana" in every proposed name.

Provide a mixture of:

- Descriptive names.
- Brand-oriented names.
- Modern SaaS-style names.
- Names related to tracking, operations, workflow, or endoso.

For each proposed name, briefly explain the reasoning and possible drawbacks.

---

# 38. GitHub repository name

Recommend GitHub repository names separately from the product name.

The repository name should ideally be:

- Short.
- Lowercase.
- Kebab-case.
- Easy to type.
- Appropriate for a software project.
- Stable even if the product evolves.

Provide several options.

Consider names based on concepts such as:

- endoso
- sales
- operations
- tracking
- workflow
- platform
- management

Avoid unnecessarily long repository names.

Also distinguish between:

- Product name.
- Repository name.
- Internal codename.

They do not have to be identical.

---

# 39. Project documentation

Eventually, help me create a professional documentation structure.

Potential documents include:

- README.
- Product overview.
- Requirements specification.
- Business-process documentation.
- Architecture documentation.
- Database documentation.
- API documentation.
- Deployment documentation.
- User documentation.
- Security documentation.
- Decision log.
- Changelog.

Recommend which documents are actually worth maintaining.

Avoid documentation for documentation's sake.

---

# 40. Decision log

Maintain an explicit decision log throughout the project.

For each major decision, record:

- Decision.
- Status.
- Reason.
- Alternatives considered.
- Consequences.
- Date/version if relevant.

Examples:

- Customer account creation model.
- Sale completion logic.
- Task dependency model.
- File-storage strategy.
- User/role architecture.
- Database approach.
- Notification strategy.
- Customer visibility model.
- Technology stack.

This should prevent the architecture from becoming inconsistent as the project evolves.

---

# 41. How I want you to collaborate with me

Do NOT simply produce one giant final design and assume every detail is settled.

Work iteratively.

At each major stage:

1. Summarize what we know.
2. Separate confirmed facts from assumptions.
3. Identify unresolved decisions.
4. Explain important trade-offs.
5. Identify missing information.
6. Tell me what information I should obtain from Grupo Pana next.
7. Update previous decisions when new information changes them.

Maintain consistency across:

business process
→ requirements
→ UX
→ permissions
→ database
→ API
→ architecture
→ implementation.

Whenever a decision affects multiple layers, explicitly tell me.

---

# 42. Final deliverables

By the end of the analysis/design phase, I want a coherent project specification containing approximately:

1. Project overview.
2. Problem statement.
3. Objectives.
4. Scope.
5. Actors.
6. Business process.
7. 16-task specification.
8. Business rules.
9. Functional requirements.
10. Non-functional requirements.
11. Use cases.
12. Role-permission matrix.
13. Customer visibility model.
14. Notification strategy.
15. Document strategy.
16. UX information architecture.
17. Screen specification.
18. Database model.
19. ERD.
20. API design.
21. System architecture.
22. Technology-stack decision.
23. Security model.
24. BI/analytics specification.
25. MVP definition.
26. Implementation roadmap.
27. Testing strategy.
28. Deployment strategy.
29. Documentation structure.
30. Project/product naming recommendation.

---

# 43. First task

Do NOT write code.

Start by analyzing everything I have provided.

I want you to:

1. Reconstruct a clear understanding of the current business process.
2. Separate confirmed information from assumptions and open questions.
3. Compare the current Power Apps workflow with the current BI/reporting structure.
4. Identify the most important business concepts represented by both systems.
5. Identify contradictions, ambiguities, and potentially problematic assumptions.
6. Identify requirements that are already strongly implied by the current system.
7. Identify information that still needs to be obtained from Grupo Pana.
8. Propose the first concrete artifact we should create together.
9. Give me candidate project names and GitHub repository names.
10. Then guide me through the project step by step.

Remember:

The existing system is evidence of the current business process.

It is NOT the blueprint for the new system.

The goal is to understand the business deeply enough that we can design something significantly better.
