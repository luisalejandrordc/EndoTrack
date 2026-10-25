# Future improvements

- Add periodic database backups (**Rec:** a scheduled `pg_dump` to R2 from a free GitHub Actions job.).
- Analyze a more robust task dependencies and exceptional progression model involving: soft/hard dependencies, exceptional overrides, override permissions, audit trail, and warings.
- When uploading the Receipt in PDF (factura), the date and amount in USD fields could be automatically filled.
- What if the system admin wants to modify the recommended duration of a task? Then the system should allow the system admin to do it, and to preserve historical data, the recommended duration time of the previous tasks must stay the same, so the system should save screenshots of them.
- Add an option for downloading a report of a sale maybe in PDF, that looks professional and beautiful, you know, not just exporting data, but also getting cool reports.
- Should we offer the option to toggle the page language between English and Spanish? We probably should because of the nature of the customers, some of them could come from different countries.
- What would be a great way to integrate AI to this app?
  Maybe you could train an AI so it can answer questions related to the customer's registers. And also for getting information about the process, the tasks/stages, why it takes so long, given some information about each task, you know, like a consultant ai bot. Also for solving questions about the car model they are buying, some specifications, that could be interesting too.
- Should we add some kind of help section for the customer that explains each stage of the process, the endoso channel, etc?
- Should the web app act as a communication medium between the customer and the employee? Like a personal chat that is related to the current sale register opened. Should it allow file uploads? What do you think of this?
- Automatically remove archived documents after a defined period of time, or ask if they should be removed.
- Consider implementing a web scrapper for DNI/RUC lookups, here are the possible websites to look up:
  - DNI: `https://eldni.com/pe/buscar-datos-por-dni`
  - RUC: `https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp`.
- Create a special function or a new program to upload data through csv or excel files, so we can import the existing company data to out PostgreSQL database faster.
- Study the possibility of using github actions instead of cron-job.org for schedules executions.
- Implement in-app notifications for employees (and maybe for customers too).
