import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../../shared/types";
import type { ApiCustomer } from "./api";
import { LiveCustomersPage } from "./LiveCustomersPage";

// ---- a small fake of the customers API, so these tests cover the screen without a backend ----

const person = (over: Partial<ApiCustomer> = {}): ApiCustomer => ({
  id: "11111111-aaaa-bbbb-cccc-000000000001",
  customerType: "diplomatico",
  documentType: "DNI",
  documentNumber: "00123456",
  firstName: "Lucía",
  lastName: "Quispe",
  gender: "F",
  legalName: null,
  displayName: "Lucía Quispe",
  nameSource: "manual",
  nationality: "Peruana",
  phone: "999111222",
  email: "lucia@test.pe",
  contactFirstName: null,
  contactLastName: null,
  contactJobTitle: null,
  portalStatus: "not_invited",
  isActive: true,
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...over,
});

const embassy = (): ApiCustomer =>
  person({
    id: "22222222-aaaa-bbbb-cccc-000000000002",
    customerType: "embajada",
    documentType: "RUC",
    documentNumber: "20123456789",
    firstName: null,
    lastName: null,
    gender: null,
    legalName: "Embajada de Japón",
    displayName: "Embajada de Japón",
    contactFirstName: "Hiro",
    contactLastName: "Tanaka",
    contactJobTitle: "Agregado",
    email: "japon@test.pe",
    isActive: false,
    portalStatus: "invited",
  });

interface Call {
  method: string;
  path: string;
  params: URLSearchParams;
  body: Record<string, unknown> | null;
}

type Handler = (call: Call) => Response | undefined;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
const apiError = (
  status: number,
  code: string,
  message: string,
  fields?: unknown,
) => json({ error: { code, message, fields } }, status);

let customers: ApiCustomer[];
let calls: Call[];
let override: Handler | null;

function installFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const call: Call = {
        method: (init?.method ?? "GET").toUpperCase(),
        path: url.pathname.replace("/api/v1", ""),
        params: url.searchParams,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      };
      calls.push(call);
      const custom = override?.(call);
      if (custom) return custom;

      if (call.method === "GET" && call.path === "/customers") {
        const q = (call.params.get("q") ?? "").toLowerCase();
        const type = call.params.get("customerType");
        const status = call.params.get("status") ?? "all";
        const filtered = customers.filter(
          (c) =>
            c.displayName.toLowerCase().includes(q) &&
            (!type || c.customerType === type) &&
            (status === "all" || (status === "active") === c.isActive),
        );
        const page = Number(call.params.get("page") ?? 1);
        const size = Number(call.params.get("pageSize") ?? 20);
        return json({
          items: filtered.slice((page - 1) * size, page * size),
          page,
          pageSize: size,
          total: filtered.length,
        });
      }
      if (call.method === "GET" && call.path === "/customers/lookup")
        return json({ exists: false });
      if (call.method === "POST" && call.path === "/customers") {
        const created = person({
          id: "99999999-aaaa-bbbb-cccc-000000000009",
          ...(call.body as Partial<ApiCustomer>),
          displayName:
            `${call.body?.firstName ?? call.body?.legalName} ${call.body?.lastName ?? ""}`.trim(),
        });
        customers = [created, ...customers];
        return json(created, 201);
      }
      return apiError(404, "ROUTE_NOT_FOUND", "Ruta no encontrada.");
    }),
  );
}

function renderPage(role: Role = "sales_manager", query = "") {
  const toast = vi.fn();
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <LiveCustomersPage query={query} role={role} toast={toast} />
    </QueryClientProvider>,
  );
  return {
    toast,
    client,
    ...view,
    rerenderWith: (q: string) =>
      view.rerender(
        <QueryClientProvider client={client}>
          <LiveCustomersPage query={q} role={role} toast={toast} />
        </QueryClientProvider>,
      ),
  };
}

const last = <T,>(items: T[]) => items[items.length - 1];
const listCalls = () =>
  calls.filter(
    (c) =>
      c.method === "GET" &&
      c.path === "/customers" &&
      c.params.get("pageSize") === "20",
  );
const callsTo = (method: string, path: string) =>
  calls.filter((c) => c.method === method && c.path === path);

beforeEach(() => {
  customers = [person(), embassy()];
  calls = [];
  override = null;
  installFetch();
});
afterEach(() => vi.unstubAllGlobals());

// ---- listing ----

describe("listing", () => {
  it("shows the customers and the totals from the API", async () => {
    renderPage();
    expect(await screen.findByText("Lucía Quispe")).toBeInTheDocument();
    expect(screen.getByText("Embajada de Japón")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("Embajada"),
    ).toBeInTheDocument(); // type label, not the raw key
    expect(screen.getByText("Invitado")).toBeInTheDocument();
    expect(screen.getByText("2 registros")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/Mostrando/)).toHaveTextContent("1–2 de 2"),
    );
  });

  it("asks the server for the search, filters and page instead of filtering in the browser", async () => {
    const user = userEvent.setup();
    const { rerenderWith } = renderPage();
    await screen.findByText("Lucía Quispe");

    rerenderWith("lucía");
    await waitFor(
      () => expect(last(listCalls())?.params.get("q")).toBe("lucía"),
      { timeout: 2000 },
    );
    expect(await screen.findByText("1 registros")).toBeInTheDocument();
    expect(screen.queryByText("Embajada de Japón")).not.toBeInTheDocument();

    rerenderWith("");
    await user.selectOptions(
      screen.getByLabelText("Tipo de cliente"),
      "embajada",
    );
    await waitFor(() =>
      expect(last(listCalls())?.params.get("customerType")).toBe("embajada"),
    );
    await user.selectOptions(screen.getByLabelText("Estado"), "inactive");
    await waitFor(() =>
      expect(last(listCalls())?.params.get("status")).toBe("inactive"),
    );
    expect(await screen.findByText("Embajada de Japón")).toBeInTheDocument();
  });

  it("pages through results and returns to page 1 when a filter changes", async () => {
    customers = Array.from({ length: 45 }, (_, i) =>
      person({
        id: `id-${i}`,
        displayName: `Cliente ${String(i).padStart(2, "0")}`,
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cliente 00");
    expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Página siguiente"));
    await screen.findByText("Cliente 20");
    expect(last(listCalls())?.params.get("page")).toBe("2");
    expect(screen.getByLabelText("Página anterior")).toBeEnabled();

    await user.click(screen.getByLabelText("Página siguiente"));
    await screen.findByText("Cliente 40");
    expect(screen.getByLabelText("Página siguiente")).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Estado"), "active");
    await screen.findByText(/Página 1 de 3/);
    expect(last(listCalls())?.params.get("page")).toBe("1");
  });

  it("explains an error and retries on demand", async () => {
    const user = userEvent.setup();
    let failing = true;
    override = (call) =>
      failing &&
      call.path === "/customers" &&
      call.params.get("pageSize") === "20"
        ? apiError(500, "INTERNAL_ERROR", "Ocurrió un error inesperado.")
        : undefined;
    renderPage();
    expect(
      await screen.findByText("No se pudo cargar la lista"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ocurrió un error inesperado."),
    ).toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(await screen.findByText("Lucía Quispe")).toBeInTheDocument();
  });

  it("tells an empty directory from an empty search", async () => {
    customers = [];
    const view = renderPage("sales_advisor");
    expect(await screen.findByText("Aún no hay clientes")).toBeInTheDocument();
    expect(
      screen.getByText(/cuando los creas o cuando se te asigna/),
    ).toBeInTheDocument();
    view.unmount();

    customers = [person()];
    const second = renderPage("sales_manager");
    await screen.findByText("Lucía Quispe");
    second.rerenderWith("zzz");
    expect(
      await screen.findByText("Sin resultados", {}, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it("shows the advisor's scope in the summary", async () => {
    renderPage("sales_advisor");
    await screen.findByText("Lucía Quispe");
    expect(screen.getByText("Tu cartera")).toBeInTheDocument();
    expect(screen.getByText("en tu cartera")).toBeInTheDocument();
  });
});

// ---- creating ----

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("Lucía Quispe");
  await user.click(screen.getByRole("button", { name: /Nuevo cliente/ }));
  return screen.getByRole("dialog", { name: "Nuevo cliente" });
}

async function fillContact(
  dialog: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(within(dialog).getByLabelText("Nacionalidad"), "Peruana");
  await user.type(within(dialog).getByLabelText("Teléfono"), "999000111");
  await user.type(
    within(dialog).getByLabelText("Correo electrónico"),
    "nuevo@test.pe",
  );
  await user.selectOptions(within(dialog).getByLabelText("Género"), "F");
}

describe("creating a customer", () => {
  it("fills the names from the document check, locks them, and creates with the right provenance", async () => {
    const user = userEvent.setup();
    override = (call) =>
      call.path === "/lookups/identity"
        ? json({
            documentType: "DNI",
            documentNumber: "45678901",
            source: "provider",
            firstName: "ANA",
            lastName: "ROJAS DIAZ",
          })
        : undefined;
    const { toast } = renderPage();
    const dialog = await openCreate(user);

    await user.type(
      within(dialog).getByLabelText("Número de documento"),
      "45678901",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /Verificar y autocompletar/ }),
    );

    expect(
      await within(dialog).findByText(/Nombre obtenido de RENIEC/),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Nombres")).toHaveValue("ANA");
    expect(within(dialog).getByLabelText("Nombres")).toHaveAttribute(
      "readonly",
    );
    expect(within(dialog).getByLabelText("Apellidos")).toHaveValue(
      "ROJAS DIAZ",
    );
    expect(callsTo("GET", "/customers/lookup")).toHaveLength(1);
    expect(
      callsTo("GET", "/lookups/identity")[0].params.get("documentNumber"),
    ).toBe("45678901");

    await fillContact(dialog, user);
    await user.click(
      within(dialog).getByRole("button", { name: "Crear cliente" }),
    );

    await waitFor(() => expect(callsTo("POST", "/customers")).toHaveLength(1));
    expect(callsTo("POST", "/customers")[0].body).toEqual({
      customerType: "diplomatico",
      documentType: "DNI",
      documentNumber: "45678901",
      nameSource: "looked_up",
      firstName: "ANA",
      lastName: "ROJAS DIAZ",
      gender: "F",
      nationality: "Peruana",
      phone: "999000111",
      email: "nuevo@test.pe",
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cliente creado", tone: "success" }),
    );
    expect(await screen.findByText("ANA ROJAS DIAZ")).toBeInTheDocument(); // the list refetched
  });

  it("lets the person unlock a looked-up name and then sends it as manual", async () => {
    const user = userEvent.setup();
    override = (call) =>
      call.path === "/lookups/identity"
        ? json({
            documentType: "DNI",
            documentNumber: "45678901",
            source: "provider",
            firstName: "ANA",
            lastName: "ROJAS",
          })
        : undefined;
    renderPage();
    const dialog = await openCreate(user);
    await user.type(
      within(dialog).getByLabelText("Número de documento"),
      "45678901",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /Verificar y autocompletar/ }),
    );
    await within(dialog).findByText(/Nombre obtenido de RENIEC/);

    await user.click(
      within(dialog).getByRole("button", { name: "Editar manualmente" }),
    );
    const first = within(dialog).getByLabelText("Nombres");
    expect(first).not.toHaveAttribute("readonly");
    await user.clear(first);
    await user.type(first, "Ana María");
    await fillContact(dialog, user);
    await user.click(
      within(dialog).getByRole("button", { name: "Crear cliente" }),
    );
    await waitFor(() => expect(callsTo("POST", "/customers")).toHaveLength(1));
    expect(callsTo("POST", "/customers")[0].body).toMatchObject({
      nameSource: "manual",
      firstName: "Ana María",
    });
  });

  it("clears a looked-up name when the document changes afterwards", async () => {
    const user = userEvent.setup();
    override = (call) =>
      call.path === "/lookups/identity"
        ? json({
            documentType: "DNI",
            documentNumber: "45678901",
            source: "provider",
            firstName: "ANA",
            lastName: "ROJAS",
          })
        : undefined;
    renderPage();
    const dialog = await openCreate(user);
    await user.type(
      within(dialog).getByLabelText("Número de documento"),
      "45678901",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /Verificar y autocompletar/ }),
    );
    await within(dialog).findByText(/Nombre obtenido de RENIEC/);

    await user.type(within(dialog).getByLabelText("Número de documento"), "9");
    expect(within(dialog).getByLabelText("Nombres")).toHaveValue("");
    expect(within(dialog).getByLabelText("Nombres")).not.toHaveAttribute(
      "readonly",
    );
    expect(
      within(dialog).queryByText(/Nombre obtenido de RENIC/),
    ).not.toBeInTheDocument();
  });

  it.each([
    [
      "not found",
      404,
      "IDENTITY_NOT_FOUND",
      "No se encontró el documento. Ingrese los datos manualmente.",
    ],
    [
      "quota exhausted",
      409,
      "LOOKUP_QUOTA_EXHAUSTED",
      "Se agotó el cupo mensual de consultas automáticas. Ingrese los datos manualmente.",
    ],
    [
      "rate limited",
      429,
      "RATE_LIMITED",
      "Demasiadas consultas seguidas. Espere un momento e intente nuevamente.",
    ],
    [
      "provider down",
      503,
      "LOOKUP_UNAVAILABLE",
      "La consulta automática no está disponible. Ingrese los datos manualmente.",
    ],
  ])(
    "keeps manual entry open when the automatic lookup fails (%s)",
    async (_name, status, code, message) => {
      const user = userEvent.setup();
      override = (call) =>
        call.path === "/lookups/identity"
          ? apiError(status, code, message)
          : undefined;
      renderPage();
      const dialog = await openCreate(user);
      await user.type(
        within(dialog).getByLabelText("Número de documento"),
        "45678901",
      );
      await user.click(
        within(dialog).getByRole("button", {
          name: /Verificar y autocompletar/,
        }),
      );

      expect(
        await within(dialog).findByText(new RegExp(message.slice(0, 25))),
      ).toBeInTheDocument();
      expect(within(dialog).getByLabelText("Nombres")).not.toHaveAttribute(
        "readonly",
      );
      await user.type(within(dialog).getByLabelText("Nombres"), "Ana");
      expect(within(dialog).getByLabelText("Nombres")).toHaveValue("Ana");
    },
  );

  it("only checks existence for documents Codart cannot look up", async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openCreate(user);
    await user.selectOptions(
      within(dialog).getByLabelText("Tipo de documento"),
      "CE",
    );
    await user.type(
      within(dialog).getByLabelText("Número de documento"),
      "AB1234567",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Verificar documento" }),
    );
    expect(
      await within(dialog).findByText(/Completa los datos manualmente/),
    ).toBeInTheDocument();
    expect(callsTo("GET", "/lookups/identity")).toHaveLength(0);
  });

  it("offers the existing customer instead of creating a duplicate", async () => {
    const user = userEvent.setup();
    override = (call) =>
      call.path === "/customers/lookup"
        ? json({ exists: true, access: "full", customer: person() })
        : undefined;
    renderPage();
    const dialog = await openCreate(user);
    await user.type(
      within(dialog).getByLabelText("Número de documento"),
      "00123456",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /Verificar y autocompletar/ }),
    );

    expect(
      await within(dialog).findByText(/Este cliente ya está registrado:/),
    ).toBeInTheDocument();
    expect(callsTo("GET", "/lookups/identity")).toHaveLength(0); // no provider call for a known customer
    expect(
      within(dialog).getByRole("button", { name: "Crear cliente" }),
    ).toBeDisabled();

    await user.click(
      within(dialog).getByRole("button", { name: "Abrir ficha" }),
    );
    const ficha = await screen.findByRole("dialog", {
      name: "Ficha del cliente",
    });
    expect(within(ficha).getByLabelText("Nombres")).toHaveValue("Lucía");
  });

  it("tells an advisor the customer exists without showing anything but the name", async () => {
    const user = userEvent.setup();
    override = (call) =>
      call.path === "/customers/lookup"
        ? json({
            exists: true,
            access: "name_only",
            brief: {
              id: "x",
              displayName: "Embajada Secreta",
              customerType: "embajada",
              isActive: true,
            },
          })
        : undefined;
    renderPage("sales_advisor");
    const dialog = await openCreate(user);
    await user.type(
      within(dialog).getByLabelText("Número de documento"),
      "45678901",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /Verificar y autocompletar/ }),
    );

    expect(
      await within(dialog).findByText(
        /ya está registrado como Embajada Secreta/,
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Crear cliente" }),
    ).toBeDisabled();
    expect(
      within(dialog).queryByRole("button", { name: "Abrir ficha" }),
    ).not.toBeInTheDocument();
  });

  it("validates before sending and marks every missing field", async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openCreate(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Crear cliente" }),
    );

    expect(
      await within(dialog).findByText("Revisa los campos marcados."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("El número de documento es obligatorio."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("El nombre es obligatorio."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("El correo es obligatorio."),
    ).toBeInTheDocument();
    expect(callsTo("POST", "/customers")).toHaveLength(0);
  });

  it("shows the server's field errors next to the fields", async () => {
    const user = userEvent.setup();
    override = (call) =>
      call.method === "POST" && call.path === "/customers"
        ? apiError(422, "VALIDATION_FAILED", "Revise los datos ingresados.", [
            {
              field: "email",
              code: "INVALID_EMAIL",
              message: "El correo no es válido (servidor).",
            },
          ])
        : undefined;
    renderPage();
    const dialog = await openCreate(user);
    await user.type(
      within(dialog).getByLabelText("Número de documento"),
      "45678901",
    );
    await user.type(within(dialog).getByLabelText("Nombres"), "Ana");
    await user.type(within(dialog).getByLabelText("Apellidos"), "Rojas");
    await fillContact(dialog, user);
    await user.click(
      within(dialog).getByRole("button", { name: "Crear cliente" }),
    );

    expect(
      await within(dialog).findByText("El correo no es válido (servidor)."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Nuevo cliente" }),
    ).toBeInTheDocument(); // stays open
  });

  it("switches to the organization form and sends the organization fields", async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openCreate(user);
    await user.selectOptions(
      within(dialog).getByLabelText("Tipo de cliente"),
      "embajada",
    );
    expect(within(dialog).getByLabelText("Tipo de documento")).toHaveValue(
      "RUC",
    );
    expect(within(dialog).queryByLabelText("Género")).not.toBeInTheDocument();

    await user.type(
      within(dialog).getByLabelText("Número de documento"),
      "20123456789",
    );
    await user.type(
      within(dialog).getByLabelText("Razón social"),
      "Embajada de Chile",
    );
    await user.type(
      within(dialog).getByLabelText("País o nacionalidad"),
      "Chilena",
    );
    const names = within(dialog).getAllByLabelText("Nombres");
    await user.type(names[0], "Pedro");
    await user.type(within(dialog).getAllByLabelText("Apellidos")[0], "Soto");
    await user.type(within(dialog).getByLabelText("Cargo"), "Secretario");
    await user.type(within(dialog).getByLabelText("Teléfono"), "014440000");
    await user.type(
      within(dialog).getByLabelText("Correo electrónico"),
      "chile@test.pe",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Crear cliente" }),
    );

    await waitFor(() => expect(callsTo("POST", "/customers")).toHaveLength(1));
    const body = callsTo("POST", "/customers")[0].body!;
    expect(body).toMatchObject({
      customerType: "embajada",
      documentType: "RUC",
      legalName: "Embajada de Chile",
      contactFirstName: "Pedro",
      contactLastName: "Soto",
      contactJobTitle: "Secretario",
    });
    expect(body).not.toHaveProperty("firstName");
    expect(body).not.toHaveProperty("gender");
  });
});

// ---- editing ----

async function openEdit(
  user: ReturnType<typeof userEvent.setup>,
  name = "Lucía Quispe",
) {
  await screen.findByText(name);
  await user.click(
    screen.getByRole("button", { name: `Abrir ficha de ${name}` }),
  );
  return screen.getByRole("dialog", { name: "Ficha del cliente" });
}

describe("editing a customer", () => {
  it("sends only what changed, with the version, and keeps Save off until something changes", async () => {
    const user = userEvent.setup();
    let patched: ApiCustomer | null = null;
    override = (call) => {
      if (call.method === "PATCH") {
        patched = person({
          ...(call.body as Partial<ApiCustomer>),
          version: 2,
        });
        return json(patched);
      }
      return undefined;
    };
    const { toast } = renderPage();
    const dialog = await openEdit(user);
    const save = within(dialog).getByRole("button", {
      name: "Guardar cambios",
    });
    expect(save).toBeDisabled();

    const phone = within(dialog).getByLabelText("Teléfono");
    await user.clear(phone);
    await user.type(phone, "999000111");
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() =>
      expect(callsTo("PATCH", `/customers/${person().id}`)).toHaveLength(1),
    );
    expect(callsTo("PATCH", `/customers/${person().id}`)[0].body).toEqual({
      version: 1,
      phone: "999000111",
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cliente actualizado" }),
    );
  });

  it("explains a version conflict and reloads the latest record on demand", async () => {
    const user = userEvent.setup();
    override = (call) => {
      if (call.method === "PATCH")
        return apiError(
          409,
          "VERSION_CONFLICT",
          "Otro usuario modificó este registro. Recargue e intente nuevamente.",
        );
      if (call.method === "GET" && call.path === `/customers/${person().id}`)
        return json(person({ phone: "955555555", version: 5 }));
      return undefined;
    };
    renderPage();
    const dialog = await openEdit(user);
    const email = within(dialog).getByLabelText("Correo electrónico");
    await user.clear(email);
    await user.type(email, "otro@test.pe");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await within(dialog).findByText(/Otra persona modificó esta ficha/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    ).toBeDisabled();
    await user.click(
      within(dialog).getByRole("button", { name: "Cargar los cambios" }),
    );
    await waitFor(() =>
      expect(within(dialog).getByLabelText("Teléfono")).toHaveValue(
        "955555555",
      ),
    );
    expect(
      within(dialog).queryByText(/Otra persona modificó/),
    ).not.toBeInTheDocument();
  });

  it("explains that editing a looked-up name makes it manual", async () => {
    const user = userEvent.setup();
    customers = [person({ nameSource: "looked_up" })];
    renderPage();
    const dialog = await openEdit(user);
    expect(
      within(dialog).getByText(/quedará registrado como ingresado manualmente/),
    ).toBeInTheDocument();
  });
});

// ---- who can deactivate and delete ----

describe("administration actions by role", () => {
  it("gives advisors no administration zone", async () => {
    const user = userEvent.setup();
    renderPage("sales_advisor");
    const dialog = await openEdit(user);
    expect(
      within(dialog).queryByRole("button", { name: "Desactivar" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: /Eliminar/ }),
    ).not.toBeInTheDocument();
  });

  it("lets a manager deactivate but not delete", async () => {
    const user = userEvent.setup();
    renderPage("sales_manager");
    const dialog = await openEdit(user);
    expect(
      within(dialog).getByRole("button", { name: "Desactivar" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: /Eliminar/ }),
    ).not.toBeInTheDocument();
  });

  it("deactivates and reactivates after confirmation", async () => {
    const user = userEvent.setup();
    override = (call) => {
      if (call.method === "POST" && call.path.endsWith("/deactivate"))
        return json(person({ isActive: false, version: 2 }));
      if (call.method === "POST" && call.path.endsWith("/reactivate"))
        return json(person({ isActive: true, version: 3 }));
      return undefined;
    };
    const { toast } = renderPage("sales_manager");
    const dialog = await openEdit(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Desactivar" }),
    );
    const confirm = await screen.findByRole("dialog", {
      name: "Desactivar cliente",
    });
    await user.click(
      within(confirm).getByRole("button", { name: "Desactivar" }),
    );

    await waitFor(() =>
      expect(
        callsTo("POST", `/customers/${person().id}/deactivate`),
      ).toHaveLength(1),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cliente desactivado" }),
    );
    // The ficha now offers the opposite action.
    expect(
      await within(dialog).findByRole("button", { name: "Reactivar" }),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Reactivar" }));
    await user.click(
      within(
        await screen.findByRole("dialog", { name: "Reactivar cliente" }),
      ).getByRole("button", { name: "Reactivar" }),
    );
    await waitFor(() =>
      expect(
        callsTo("POST", `/customers/${person().id}/reactivate`),
      ).toHaveLength(1),
    );
  });

  it("makes an admin give a reason to delete, and sends it", async () => {
    const user = userEvent.setup();
    override = (call) =>
      call.method === "DELETE"
        ? new Response(null, { status: 204 })
        : undefined;
    const { toast } = renderPage("system_admin");
    const dialog = await openEdit(user);
    await user.click(within(dialog).getByRole("button", { name: /Eliminar/ }));
    const confirm = await screen.findByRole("dialog", {
      name: "Eliminar cliente",
    });

    await user.click(
      within(confirm).getByRole("button", { name: "Eliminar definitivamente" }),
    );
    expect(
      await within(confirm).findByText("Escribe el motivo de la eliminación."),
    ).toBeInTheDocument();
    expect(callsTo("DELETE", `/customers/${person().id}`)).toHaveLength(0);

    await user.type(
      within(confirm).getByLabelText(/Motivo/),
      "Registro duplicado",
    );
    await user.click(
      within(confirm).getByRole("button", { name: "Eliminar definitivamente" }),
    );
    await waitFor(() =>
      expect(callsTo("DELETE", `/customers/${person().id}`)).toHaveLength(1),
    );
    expect(
      callsTo("DELETE", `/customers/${person().id}`)[0].params.get("reason"),
    ).toBe("Registro duplicado");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cliente eliminado" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("explains why a customer with sales cannot be deleted", async () => {
    const user = userEvent.setup();
    override = (call) =>
      call.method === "DELETE"
        ? apiError(
            409,
            "CUSTOMER_HAS_SALES",
            "El cliente tiene ventas y no puede eliminarse. Desactívelo en su lugar.",
          )
        : undefined;
    renderPage("system_admin");
    const dialog = await openEdit(user);
    await user.click(within(dialog).getByRole("button", { name: /Eliminar/ }));
    const confirm = await screen.findByRole("dialog", {
      name: "Eliminar cliente",
    });
    await user.type(within(confirm).getByLabelText(/Motivo/), "Error");
    await user.click(
      within(confirm).getByRole("button", { name: "Eliminar definitivamente" }),
    );
    expect(
      await within(confirm).findByText(/tiene ventas y no puede eliminarse/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Eliminar cliente" }),
    ).toBeInTheDocument();
  });
});
