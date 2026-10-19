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

# 3. Current internal application

The current internal application (Power Apps) contains screens/functions that include, among other things:

- Active sales listing.
- Completed sales listing.
- Filtering and searching.
- Customer registration.
- Sale registration.
- Vehicle/model selection.
- Color selection.
- Customer information.
- Sale classification/evaluation.
- Detailed sale view.
- 14-task process visualization.
- Task-specific detail/editing.
- Notes.
- Task timing information.
- Specific task management such as official quotation, and others.

These screens should help us understand the current workflow, information used by employees, and existing terminology.

However, do NOT assume that the current navigation, categories, layout, or interaction patterns are the correct UX for the new system.

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
- Create and manage cars/vehicles.
- Create and manage sale operations.
- Track progress through the sale tasks/stages.
- Enter task-specific information (could be simple data like text, numbers, or dates, or even document uploads and management).
- Update the state of each of the tasks (respecting the correspondent dependencies and data requirements).
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
- Receive meaningful updates and notifications.

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

The operation then reaches the previous first stage: preparing and sending an initial quotation.

Some time may pass while the customer evaluates the proposal.

If the customer decides to proceed, the sales advisor prepares an updated/final quotation, now the official first stage.

Afterward, the operation progresses through a sequence of 14 tasks, including the present task.

---

# 9. The 14-task process

Each sale consists of 14 tasks/stages.

1. **Cotización del Vehículo**
   - _Description:_ Elaboración de la cotización oficial en Word y Excel que define el precio base, la comisión porcentual y en dólares de Grupo Pana, y el precio final del vehículo.
   - _Fields_:
     - Precio del vehículo sin comisión in USD [Textbox]
     - Comisión de Grupo Pana in USD [Textbox - automatically filled if next field was manually set]
     - Comisión de Grupo Pana in % [Textbox - automatically filled if previous field was manually set]
     - Precio final del vehículo in USD [Textbox - sum of vehicle price and commission] **(visible)**
     - Cotización del vehículo [Document - Word] **(visible)**
     - Cotización del vehículo [Document - Excel] **(visible)**
   - _Recommended duration:_ None
   - _Task dependency:_ None
2. **Debida Diligencia del Cliente**
   - _Description:_ Recopilación de los documentos de identidad del firmante y registro de la Declaración Jurada de Conocimiento del Cliente, determinando su condición PEP y el régimen DDC aplicable.
   - _Fields:_
     - Documento de Identidad del Firmante (Diplomático -> cliente, Embajada/Entidad Religiosa/OI -> representante/ejecutante)
       - Tipo de Documento [Combobox - Documento Nacional de Identidad (DNI), Carné de Extranjería (CE), Pasaporte (PAS), Cédula Diplomática de Identidad (CDI)] **(visible)**
       - Número de Documento [Textbox] **(visible)**
       - Nombre Completo [Textbox] **(visible)**
       - Documento Escaneado [Document - PDF] **(visible)**
     - Declaración Jurada de Conocimiento del Cliente [Document - PDF] **(visible)**
     - If customer.type != Diplomático then ask for Vigencia de Poder [Document - PDF] **(visible)**
     - Condición PEP [Combobox - No PEP, PEP, Relacionado con PEP]
     - Régimen DDC [Combobox - General, Reforzado]
   - _Recommended duration:_ 3 days
   - _Task dependency:_ 1
3. **Liquidación de Unidad**
   - _Description:_ Asignación del número de serie único al vehículo, cálculo del monto a pagar a Toyota y carga del documento PDF de liquidación.
   - _Fields:_
     - Número de serie [Textbox - Unique] **(visible)**
     - Monto a pagar a Toyota [Textbox]
     - Liquidación [Document - PDF]
   - _Recommended duration:_ 12 days
   - _Task dependency:_ 2
4. **Resumen de Venta**
   - _Description:_ Consolidación de los costos asociados, incluyendo el monto en dólares de los accesorios, las comisiones actualizadas y los costos del trámite de liberación.
   - _Fields:_
     - Monto Accesorios in USD [Textbox]
     - Monto Comisión in USD [Textbox] (may've changed from the commission stablished at the first task/stage, because of the new prices in "Liquidación de Endoso")
     - Monto Trámite de Liberación in USD [Textbox]
     - Resumen de Venta [Document - PDF] **(visible)**
   - _Recommended duration:_ None
   - _Task dependency:_ 3
5. **Pago a Grupo Pana**
   - _Description:_ Verificación del abono realizado por el cliente, registrando el banco, la fecha, el número de operación único y adjuntando el voucher en PDF.
   - _Fields:_
     - Banco de Operación [Combobox - BCP, BBVA, Scotiabank, Interbank, ...] **(visible)**
     - Fecha de Operación [Date] **(visible)**
     - Número de Operación [Textbox - Unique] **(visible)**
     - Monto Depositado in USD [Textbox] (Theoretically should be the same as the final car price stablished in the first task) **(visible)**
     - Voucher de Pago [Document - PDF] **(visible)**
   - _Recommended duration:_ None
   - _Task dependency:_ 1
6. **Pago a Toyota**
   - _Description:_ Registro del abono interno realizado a Toyota, documentando los datos bancarios, el voucher y la confirmación oficial del pago.
   - _Fields:_
     - Banco de Operación [Combobox - BCP, BBVA, Scotiabank, Interbank, ...]
     - Fecha de Operación [Date]
     - Número de Operación [Textbox - Unique]
     - Monto Depositado in USD [Textbox] (Theoretically should be the same as the price stablished in the third task)
     - Voucher de Pago [Document - PDF]
     - Confirmación de Pago [Document - PDF]
   - _Recommended duration:_ None
   - _Task dependency:_ 3 and 5
7. **Facturación**
   - _Description:_ Emisión y registro de las facturas oficiales (vehículo, accesorios, comisión y trámite de liberación), especificando número, fecha y monto para cada una.
   - _Fields:_
     - Factura Toyota
       - Número [Textbox]
       - Fecha [Date]
       - Monto in USD [Textbox] (Should be the same as the price stablished in the third task)
       - Archivo [Document - PDF]
     - Factura Accesorios
       - Número [Textbox] **(visible)**
       - Fecha [Date] **(visible)**
       - Monto in USD [Textbox] (Should be the same as the price stablished in the fourth task) **(visible)**
       - Archivo [Document - PDF] **(visible)**
     - Factura Comisión
       - Número [Textbox]
       - Fecha [Date]
       - Monto in USD [Textbox] (Should be the same as the price stablished in the fourth task)
       - Archivo [Document - PDF]
     - Factura Trámite de Liberación
       - Número [Textbox]
       - Fecha [Date]
       - Monto in USD [Textbox] (Should be the same as the price stablished in the fourth task)
       - Archivo [Document - PDF]
   - _Recommended duration:_ None
   - _Task dependency:_ 5 and 6
8. **Documentos Endosados**
   - _Description:_ Recepción y carga en el sistema de los documentos endosados oficiales para continuar con el proceso aduanero.
   - _Fields:_
     - Documentos endosados [Document - PDF]
   - _Recommended duration:_ 10 days
   - _Task dependency:_ 7
9. **Trámite Aduanero**
   - _Description:_ Gestión de nacionalización del vehículo, registrando el Pedido de Depósito, el número DAM, la aduana, el canal de control y adjuntando el Certificado Aduanero.
   - _Fields:_
     - Pedido de Depósito [Document - PDF]
     - Número de Declaración Aduanera de Mercancías (DAM) [Textbox]
     - Aduana [Combobox - Aduanas disponibles en Perú]
     - Canal de control [Combobox - Verde, Naranja, Rojo]
     - Certificado Aduanero [Document - PDF]
   - _Recommended duration:_ 12 days
   - _Task dependency:_ 8
10. **Trámite de Liberación**
    - _Description:_ Asignación de un encargado interno y seguimiento del periodo de liberación del vehículo.
    - _Fields:_
      - Encargado [Textbox]
    - _Recommended duration:_ 30 days
    - _Task dependency:_ 9
11. **Inmatriculación y Placas**
    - _Description:_ Registro legal del vehículo, asignación del número de placa definitivo y carga de la Tarjeta de Identificación Vehicular Electrónica (TIVe).
    - _Fields:_
      - N.° de Placa [Textbox - Unique] **(visible)**
      - Fecha de Inmatriculación [Date] **(visible)**
      - Tarjeta de Identificación Vehicular Electrónica (TIVe) [Document - PDF] **(visible)**
    - _Recommended duration:_ 15 days
    - _Task dependency:_ 10
12. **Traslado a PDS**
    - _Description:_ Confirmación y registro de la fecha en la que el vehículo es trasladado al centro de inspección de pre-entrega.
    - _Fields:_
      - Fecha de Traslado [Date] **(visible)**
    - *Recommended duration: None
    - _Task dependency:_ 11
13. **Equipamiento**
    - _Description:_ Instalación de accesorios registrando el número de la Orden de Servicio, el documento adjunto y la fecha de finalización.
    - _Fields:_
      - N.° de Orden de Servicio [Textbox]
      - Orden de Servicio [Document - PDF]
      - Fin de Equipamiento [Date] **(visible)**
    - _Recommended duration:_ None
    - _Task dependency:_ 12
14. **Entrega de Vehículo**
    - _Description:_ Coordinación final que registra la fecha opcional de traslado a Surquillo, la fecha de entrega oficial y el Acta de Entrega firmada.
    - _Fields:_
      - Fecha de Traslado a Surquillo [Date - Optional] **(visible)**
      - Fecha de Entrega del Vehículo [Date] **(visible)**
      - Acta de Entrega del Vehículo [Document - PDF] **(visible)**
    - _Recommended duration:_ None
    - _Task dependency:_ 13

**Important observations:**

- The **(visible)** tag tells that the field (data or document) should be available for the customer site.
- A task can only start once all its dependencies have been completed.
- All fields and documents that are not specified to be optional, are required for the task to be completed.
- The recommended duration time refers to the elapsed time between a task going from In Progress to Completed.
- Each task must have a field for Notes [Textarea, optional].
- For each document upload, the system must save the file type and size in bytes, this could be particularly useful for data analytics.
- Every task has three available statuses: "pending", "in_progress", and "completed".
- Add confirmation messages before updating a task status, this is specially important, cause after setting a task as completed, only a sale manager and system admin can undo it or update fields/documents.

---

# 11. Sale register

Each sale register currently represents exactly one vehicle sale.

A customer purchasing two vehicles would normally have two independent sale registers.

Each register includes information such as:

- About the customer
  - Customer_ID
  - Historical sales records must remain immutable for financial and legal auditing purposes, so we save snapshots at the time of the sale's creation of:
    - Legal Name
    - Document Type
    - Document Number
- About the vehicle
  - Vehicle_ID
  - Version
    - Snapshot of its reference price
  - Color
- General
  - 14 tasks data.
  - Progress.
  - Timeline.
  - Documents.
  - Temperature (represents the probability of completion) [Combobox - Hot, Warm, Cold]
  - Creation timestamp [Timestamp - Automatically saved]
  - State [active, completed, cancelled]
  - Notes
  - Assigned sales advisor.

A sale becomes completed automatically after all its 14 tasks have been completed.

An employee (role dependent) should be able to cancel a sale operation or reopen it if necessary.

A cancelled operation should remain stored for historical purposes rather than being physically deleted.

Again, this doesn't have to be necessarily the final structure for the sale register.

---

# 12. Customer model

A customer needs information such as:

- Customer type.
  - Business-to-Customer (B2C)
    - Diplomático.
  - Business-to-Business (B2B)
    - Embajada.
    - Entidad religiosa (católica).
    - Entidad religiosa (no católica).
    - Organización Internacional.
- Document type.
  - Business-to-Customer (B2C)
    - Documento Nacional de Identidad (DNI).
    - Carné de Extranjería (CE).
    - Pasaporte (PAS).
    - Cédula Diplomática de Identidad (CDI).
  - Business-to-Business (B2B)
    - Registro Único de Contribuyente (RUC).
- Document number.
- First Name (B2C).
- Last Name (B2C).
- Razon Social (B2B).
- Nationality / country.
- Password.
- Contact.
  - First name. (B2B)
  - Last name. (B2B)
  - Job Title. (B2B)
  - Phone.
  - Email.

For RUC and DNI customers, the relevant name must be automatically filled by using one of these two options:

- External API from a free plan provider like (https://api-codart.cgrt.org/), I could create an account and get a token for which I would obtain 110 DNI/RUC requests per month for free. Which is fine for the prototype.
- Web scrapper (using python for example). You could visit https://eldni.com/pe/buscar-datos-por-dni for DNI lookups and https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp for RUC lookups.
  If the process does not run as expected, there could be a fallback for manually inserting the information.

Document type + document number should uniquely identify the customer.

A single customer can have multiple independent sale registers.

**Customer Accounts:** Employees create customer accounts (based on role). The system auto-generates a temporary password and emails it to the customer. Customers cannot edit their profile data (Document, Name, Email, Phone) to protect contract integrity, but they can reset their passwords.

---

# 13. Employees model

An employee needs information such as:

- Document type.
  - Documento Nacional de Identidad (DNI).
  - Carné de Extranjería (CE).
  - Pasaporte (PAS).
- Document number.
- First Name.
- Last Name.
- Nationality / country.
- Gender.
- Profile picture.
- Birthdate.
- Password.
- Hire date.
- Active [boolean]
- Role.
  - System admin.
  - Sales manager.
  - Sales advisor.
- Personal contact.
  - Phone.
  - Email.
- Business contact.
  - Phone.
  - Email.

---

# 13. Vehicles/Models catalog

A sale contains vehicle information.

The vehicle model should determine which colors are available.

I am considering a dedicated vehicle catalog section where authorized employees can:

- Create new vehicle models.
- Edit models.
- Edit versions.
- Deactivate models or versions.
- Manage colors.
- Upload images for each color.
- Replace images.

A vehicle currently needs information such as:

- Model name
- Description
- Categories
  - Camioneta.
  - Comercial.
  - Familiar.
  - Hatchback.
  - Sedan.
- Available versions (could be many)
  - Version name
  - Reference price
- Available colors (could be many)
  - Images per color (perhaps at least the main view image should be required, and then the system could display a special image for fields with no-image, but the ideal situation is that the user uploads all of them)
    - Main view
    - Exterior front.
    - Exterior left side.
    - Exterior right side.
    - Exterior rear.
    - Interior.

The system should support a professional visual representation of vehicle models.

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
- Vehicles models.
- Advisor.
- Temperature.
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

# 20. Operation detail page

The operation detail page should provide a strong overview of:

- Customer.
- Vehicle.
- Assigned advisor.
- Temperature.
- Sale state.
- Dates.
- Progress.
- 14 tasks.
- Task statuses.
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

For example, "Liquidación de Unidad" currently includes information such as:

- Número de serie [Textbox - Unique]
- Monto a pagar a Toyota [Textbox]
- Liquidación [Document - PDF]
- Task status.
- Notes.

Other tasks may require:

- Dates.
- Text.
- Numbers.
- Dropdowns.
- Boolean values.
- Multiple related values.
- Documents.

The architecture must accommodate task-specific data without becoming an unmaintainable collection of hard-coded exceptions.

Now that I have provided the full 14-task specification, determine whether task-specific data should be represented through:

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

General information that the app must show to the customer:

- Vehicle data: Model, version, categories, reference price, color, images.
- Assigned sales advisor: Full name, contact email, and contact number.
- Sale details: Creation timestamp, state, and progress timeline.

6-Stage Customer Macro-Milestones:

- **Phase 1: Cotización y Documentación** _(Groups tasks 1 and 2)_
  Se establece el estado inicial de la compra, definiendo la cotización oficial del vehículo y validando los documentos de identidad del titular.
- **Phase 2: Asignación y Pago** _(Groups tasks 3, 4, and 5)_
  Se confirma la asignación de una unidad física mediante su número de serie y se consolida el Resumen de Venta para proceder con el abono a Grupo Pana.
- **Phase 3: Facturación Oficial** _(Groups tasks 6 and 7)_
  Se confirma que los pagos han sido procesados exitosamente y se emiten las facturas oficiales correspondientes al vehículo y accesorios.
- **Phase 4: Trámites Aduaneros** _(Groups tasks 8 and 9)_
  El sistema indica que los documentos endosados han sido procesados y el vehículo se encuentra atravesando el proceso de nacionalización y declaración aduanera inicial.
- **Phase 5: Liberación y Placas** _(Groups task 10 and 11)_
  Se notifica que el vehículo se encuentra en su periodo de liberación física y avanza hacia su inmatriculación, culminando con la asignación de su número de placa definitivo en el registro público.
- **Phase 6: Preparación y Entrega** _(Groups tasks 12, 13, and 14)_
  El vehículo ingresa a la fase de equipamiento para la instalación de accesorios y se coordina su traslado para la entrega final al cliente.

---

# 23. Customer notifications

The objective of this strategy is to keep the customer informed and engaged throughout the "endoso" purchasing process while strictly avoiding email fatigue. These notifications are decoupled from the 14 internal operational task transitions and are triggered exclusively by high-value events, required actions, or emotional milestones.

### 1. Onboarding and Operation Start

These notifications ensure the customer can access the portal and confirm that their specific purchasing process has officially begun.

- **Notification 1: Account Creation (One per customer)**
  - **Trigger:** The Sales Advisor registers the customer in the database for the first time.
  - **Subject:** Bienvenido a Grupo Pana - Acceso a tu portal de seguimiento
  - **Content:** Un mensaje de bienvenida que incluye el enlace al portal de clientes, el usuario (correo) y una contraseña temporal autogenerada, junto con las instrucciones obligatorias para restablecerla por seguridad al primer ingreso.
- **Notification 2: Sale Register Creation**
  - **Trigger:** The Sales Advisor creates a new sale register, assigning a vehicle to the customer.
  - **Subject:** Hemos registrado tu nueva solicitud de vehículo
  - **Content:** Confirmación de que el proceso de compra ha iniciado. Incluye los datos referenciales del vehículo (modelo, color), el nombre y número de WhatsApp de su Asesor Comercial asignado, y un botón para visualizar la Fase 1 en el portal.

### 2. Reviews and Financials (Phases 1, 2, and 3)

These notifications drive customer action and deliver critical financial documentation.

- **Notification 3: Quote Available**
  - **Trigger:** Completion of Task 1 (Cotización del Vehículo).
  - **Subject:** Tu cotización oficial está lista para revisión
  - **Content:** Informa al cliente que los precios finales han sido estructurados. Le invita a ingresar al portal para descargar la Cotización del Vehículo (archivos Word y Excel).
- **Notification 4: Sale Summary and Physical Unit Assignment**
  - **Trigger:** Completion of Task 4 (Resumen de Venta).
  - **Subject:** Siguiente paso: Tu resumen de venta ha sido generado
  - **Content:** Notifica al cliente que ya se le ha asignado un número de serie físico a su unidad y que el Resumen de Venta está listo. Indica el monto exacto a depositar a Grupo Pana para continuar con el proceso.
- **Notification 5: Invoice Issuance**
  - **Trigger:** Completion of Task 7 (Facturación).
  - **Subject:** Tus comprobantes de pago han sido emitidos
  - **Content:** Notificación de baja urgencia que confirma que sus abonos han sido procesados y las facturas oficiales (Vehículo, Accesorios, etc.) ya están disponibles para descarga en el portal.

### 3. Logistics and Legal Procedures (Phases 4 and 5)

These communications proactively manage buyer anxiety during the longest waiting periods of the operation (customs and public registry).

- **Notification 6: Start of Customs Procedures**
  - **Trigger:** Completion of Task 8 (Documentos Endosados).
  - **Subject:** Iniciamos los trámites aduaneros de tu vehículo
  - **Content:** Un mensaje estratégico para setear expectativas. Explica que el vehículo acaba de ingresar al proceso estándar de nacionalización y declaración aduanera (el periodo de espera más largo).
- **Notification 7: License Plate Assignment**
  - **Trigger:** Completion of Task 11 (Inmatriculación y Placas).
  - **Subject:** ¡Tu vehículo ya cuenta con placa oficial!
  - **Content:** Una notificación de alta emoción. Le proporciona al cliente su número de placa definitivo y le permite descargar su Tarjeta de Identificación Vehicular Electrónica (TIVe) en PDF.

### 4. Preparation and Closing (Phase 6)

The final communications announcing the imminent delivery of the vehicle and closing the transaction loop.

- **Notification 8: Workshop Preparation**
  - **Trigger:** Completion of Task 12 (Traslado a PDS).
  - **Subject:** Tu vehículo está en fase de preparación final
  - **Content:** Avisa al cliente que los trámites legales terminaron y el vehículo ha ingresado a los talleres de Grupo Pana para la instalación de su equipamiento y accesorios finales antes de la entrega.
- **Notification 9: Operation Completed (Delivery)**
  - **Trigger:** Completion of Task 14 (Entrega de Vehículo).
  - **Subject:** ¡Felicidades por tu nuevo vehículo! / Gracias por confiar en Grupo Pana
  - **Content:** Mensaje de agradecimiento y cierre formal del ciclo de venta. Confirma la fecha de entrega realizada y pone a disposición la descarga del Acta de Entrega del Vehículo firmada en formato PDF.

---

# 24. Employee reminders and automation

The current concept includes automated reminders when a task approaches or exceeds its recommended completion period.

Potential implementation:

A server-side scheduled process periodically evaluates operations and sends reminders.

- **Overdue Calculation:** Calculate the exact due date the moment the task status changes from `not_started` to `in_progress` by adding the recommended duration (3 to 30 days) to that timestamp. Use strict calendar days—do not pause for weekends or non-business hours. (e.g., A 3-day task starting Friday at 4:00 PM is due exactly Monday at 4:00 PM).
- **Warning Threshold:** Trigger a single "Approaching Due" warning when 80% of the recommended business hours have elapsed.
- **Escalation & Recipients:**
  - _Level 1 (Warning up to 24h overdue):_ Notify only the assigned Sales Advisor.
  - _Level 2 (24h to 48h overdue):_ Escalate to the Sales Manager.
  - _Level 3 (48h+ overdue):_ Escalate to the System Admin and visually highlight the task in the UI. Do not auto-unlock or reassign.
- **Reminder Frequency:** Scale post-due recurring reminders based on the 3 to 30 day duration. Shorter tasks (e.g., 3 days) should trigger more frequent post-due reminders since the overdue time is proportionally more critical, whereas a 30-day task can have a wider reminder interval. Implement a hard cap on total recurring reminders.
- **State Tracking (Deduplication):** To prevent duplicate pings and track caps, the system must read and update three fields upon sending a notification: `last_reminder_sent_at` (Timestamp), `current_reminder_phase` ('approaching', 'overdue', 'recurring'), and `recurring_reminder_count` (Integer).
- **Audit Logging:** Record every dispatched reminder in an immutable `Notification_Log` table for accountability and analytics.
- **UI Visuals & Filtering:** In the main sale records view, add visual indicators (e.g., color-coded badges) to show if a task is 'Approaching', 'Overdue', or 'Escalated/Recurring'. Add these states as quick-filters so users can easily find urgent tasks.
- **Completion Phase Tracking:** Add a `completion_phase` field to the task data that permanently records the state of the task at the exact moment it was completed (e.g., `early`, `in_approaching`, `overdue`, or `recurring_overdue`). This locks in the performance data for future analytics.

---

# 25. File and document management

Some tasks require document uploads.

Determine:

- Maximum size.
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
- 14-task state distribution.
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

Employees roles:

- System Admin
- Sales Manager
- Sales Advisor

Here is the standard Role-Based Access Control (RBAC) matrix:

| **Module / Feature**               | **System Admin (IT/Infrastructure)**                                                         | **Sales Manager (Business Oversight)**                                                                         | **Sales Advisor (Daily Operations)**                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Staff User Management**          | **Full CRUD:** Create new staff, assign roles, reset passwords, hard delete.                 | **View Only:** Can see active staff (sale advisors only) to reassign sales.                                    | **No Access.**                                                                                   |
| **Car Models Catalog**             | **Full CRUD:** Can manage the catalog database.                                              | **Full CRU:** Add/Edit models, upload photos, archive old models.                                              | **View Only:** Can browse models to select for a sale.                                           |
| **Customer Database**              | **Full CRUD:** Can permanently wipe a customer profile.                                      | **CRU All:** Can view, edit, and create _any_ customer profile. No hard delete.                                | **CRU Own:** Create new customers; edit/view only customers tied to their own sales.             |
| **Sales Registers**                | **Full CRUD:** Can permanently delete corrupted or test sales.                               | **CRU All:** View all sales, reassign advisors, cancel any sale, undo cancellations.                           | **CRU Own:** Create, update, and cancel _own_ sales (requires reason). Cannot undo cancellation. |
| **14 Tasks & Documents**           | **Full Access:** Technical overrides if the database locks up.                               | **Full Override:** Can update/edit files on _any_ task, including unlocking/reverting completed tasks.         | **Update Own:** Update active tasks. Becomes Read-Only once marked Completed.                    |
| **BI Dashboard**                   | **Global View:** Sees all data (often used to verify system health).                         | **Global View:** Tracks overall company revenue, conversion rates, and drop-offs.                              | **Individual View:** Tracks own commissions, task speeds, and active pipeline.                   |
| **Raw Data Exports (CSV / Excel)** | **Full System Dumps:** Can export raw database tables, audit logs, and security/access logs. | **Business Dumps:** Can export global Customer lists, Sales Registers, Task Audit logs, and Cancellation logs. | **NO RAW EXPORTS:** Blocked from exporting CSV/Excel files to prevent CRM database theft.        |

---

# 28. Security

Security is a first-class requirement.

Analyze:

- Authentication.
- Authorization.
- Role-based access control.
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
- Database.
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

Here's a recommendation of a tech stack I have worked with before, well actually I have experience with the JavaScript version of it, but because of the dimension of this project it probably is a great idea to upgrade to Typescript, but again this is a recommendation only.

- Frontend: React (TypeScript)
- Backend: Node with Express (TypeScript)
- Database: PostgreSQL
- Authentication: JWT
- File storage: Cloudinary

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

Phased Development Recommended Sequence

- Phase 1: Employee Side (Core Logic & Data Production)
- Phase 2: Customer Side (Data Consumption & Visualization)
- Phase 3: Background Scheduler & Notifications (Automation)

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
6. Update previous decisions when new information changes them.

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
4. Actors.
5. Business process.
6. 14-task specification.
7. Business rules.
8. Functional requirements.
9. Non-functional requirements.
10. Use cases.
11. Role-permission matrix.
12. Customer visibility model.
13. Notification strategy.
14. Document strategy.
15. UX information architecture.
16. Screen specification.
17. Database model.
18. ERD.
19. API design.
20. System architecture.
21. Technology-stack decision.
22. Security model.
23. BI/analytics specification.
24. MVP definition.
25. Implementation roadmap.
26. Testing strategy.
27. Deployment strategy.
28. Documentation structure.

---

# 43. Authentication & System Access

**1. Separate Login Portals**

- The application must implement two physically separate login interfaces and routes (e.g., `/admin` for Employees and `/portal` for Customers) to ensure secure, isolated routing to their respective database tables.

**2. Login Credentials & UI Structure**

- **No Email Login:** The primary identifier for authentication is the user's official identification document, NOT their email address.
- Both login pages must require the following three inputs:
  - **Tipo de Documento (Dropdown):**
    - _Customer options:_ DNI, CE, RUC, PAS, CDI.
    - _Employee options:_ DNI, CE, PAS.
  - **Número de Documento (Text Field):** Must include dynamic length/format validation based on the selected document type (e.g., exactly 8 digits for DNI, 11 digits for RUC).
  - **Contraseña (Password Field):** Both the customer and employee portal must include a prominent "Olvidé mi contraseña" (Forgot password) link.

**3. Database Authentication Constraints**

- **Composite Unique Key:** Both the `Employees` and `Customers` tables must enforce a composite unique constraint on `(document_type, document_number)` to guarantee identity uniqueness for both individuals and legal entities.

**4. Session Management & Auditing**

- **Remember Me Functionality:** Both login portals must include a "Mantener sesión iniciada" checkbox. Implement secure authentication using short-lived JWT Access Tokens and long-lived Refresh Tokens (stored in HTTP-only cookies) to reduce login friction for returning users.
- **Access Tracking:** Create an append-only `AccessLogs` database table strictly for monitoring system entry and exit. The system must log every authentication event: successful logins, failed login attempts (e.g., invalid password, non-existent document number), and explicit logouts. Logs must capture the `user_type` (Employee/Customer), the `document_type` and `document_number` attempted, `user_id` (if the login was successful), `action_type` (LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT), `ip_address`, and `timestamp`.

---

# 44. First task

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
