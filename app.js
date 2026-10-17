const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const dt = (s) =>
  s
    ? new Date(s.replace(" ", "T")).toLocaleString("es-PE", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
const STATUS = {
  active: "Activa",
  completed: "Completada",
  cancelled: "Cancelada",
  pending: "Pendiente",
  in_progress: "En curso",
};
const TEMP = { Hot: "Caliente", Warm: "Tibia", Cold: "Fría" };
const badge = (cls, txt) => `<span class="badge b-${cls}">${esc(txt)}</span>`;
let me = null;

async function api(action, { body, query } = {}) {
  const qs = query ? "&" + new URLSearchParams(query) : "";
  const r = await fetch(
    "api.php?action=" + action + qs,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const d = await r
    .json()
    .catch(() => ({ error: "Respuesta inválida del servidor" }));
  if (!r.ok) {
    const e = new Error(d.error || "Error");
    e.status = r.status;
    throw e;
  }
  return d;
}
function toast(msg, err) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e.status === 401) return boot();
    toast(e.message, true);
  }
}

/* ---------- Login ---------- */
function renderLogin() {
  $("#app").innerHTML = `
  <div class="login card">
    <h2 class="brand">Grupo <span>Pana</span> · Endoso</h2>
    <p class="muted">Acceso de empleados</p>
    <form id="lf">
      <label>Tipo de documento</label>
      <select name="doc_type"><option>DNI</option><option>CE</option><option>PAS</option></select>
      <label>Número de documento</label>
      <input name="doc_number" required autocomplete="username">
      <label>Contraseña</label>
      <input name="password" type="password" required autocomplete="current-password">
      <p><button class="btn" style="width:100%">Ingresar</button></p>
    </form>
    <p class="muted" style="font-size:.8rem">Demo: DNI 00000002 / gerente123 · DNI 00000003 / asesor123<br>¿Eres cliente? <a href="portal.html">Ir al portal</a></p>
  </div>`;
  $("#lf").onsubmit = (e) => {
    e.preventDefault();
    safe(async () => {
      await api("login", { body: Object.fromEntries(new FormData(e.target)) });
      boot();
    });
  };
}

/* ---------- Shell ---------- */
function renderShell() {
  const nav = [
    ["dashboard", "Panel"],
    ["sales", "Ventas"],
    ["customers", "Clientes"],
  ];
  $("#app").innerHTML = `
  <header class="topbar">
    <div class="brand">Grupo <span>Pana</span> · Endoso</div>
    <nav>${nav.map(([k, l]) => `<button data-v="${k}">${l}</button>`).join("")}</nav>
    <div class="who">${esc(me.name)} · ${esc(me.role)}</div>
    <button class="btn sec sm" id="lo">Salir</button>
  </header>
  <main id="view"></main>`;
  document
    .querySelectorAll("nav button")
    .forEach((b) => (b.onclick = () => go(b.dataset.v)));
  $("#lo").onclick = async () => {
    await api("logout");
    me = null;
    boot();
  };
}
function go(view, arg) {
  document
    .querySelectorAll("nav button")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        b.dataset.v === view || (view === "sale" && b.dataset.v === "sales"),
      ),
    );
  safe(() =>
    ({
      dashboard: vDashboard,
      sales: vSales,
      customers: vCustomers,
      sale: vSale,
      newsale: vNewSale,
    })[view](arg),
  );
}

/* ---------- Dashboard ---------- */
async function vDashboard() {
  const d = await api("dashboard");
  const s = d.by_status,
    total = (s.active || 0) + (s.completed || 0) + (s.cancelled || 0);
  const max = Math.max(1, ...d.milestones.map(Number));
  $("#view").innerHTML = `
  <h2>Panel</h2>
  <div class="grid g3">
    <div class="card stat">${s.active || 0}<small>Operaciones activas</small></div>
    <div class="card stat">${s.completed || 0}<small>Completadas</small></div>
    <div class="card stat">${s.cancelled || 0}<small>Canceladas</small></div>
    <div class="card stat">${d.overdue.length}<small>Tareas vencidas</small></div>
  </div>
  <div class="grid g2">
    <div class="card"><h3>Operaciones activas por hito</h3>
      ${d.milestone_names.map((n, i) => `<div>${esc(n)}<div class="bar"><div style="width:${(d.milestones[i + 1] / max) * 100 || 0}%">${d.milestones[i + 1]}</div></div></div>`).join("")}
    </div>
    <div class="card"><h3>Requieren atención</h3>
      ${
        d.overdue.length
          ? `<table><tr><th>Cliente</th><th>Tarea</th><th>Atraso</th></tr>${d.overdue
              .map(
                (o) => `
        <tr class="click" onclick="go('sale',${o.sale_id})"><td>${esc(o.cname)}</td><td>${o.task_no}. ${esc(o.task_name)}</td>
        <td>${badge("L" + o.level, "Nivel " + o.level + " · " + o.hours_over + " h")}</td></tr>`,
              )
              .join("")}</table>`
          : '<p class="muted">Nada vencido. 🎉</p>'
      }
    </div>
    <div class="card"><h3>Modelos más vendidos (total ${total})</h3>
      ${d.top_models.map((m) => `<div>${esc(m.name)}<div class="bar"><div style="width:${(m.c / total) * 100}%">${m.c}</div></div></div>`).join("") || '<p class="muted">Sin datos</p>'}
    </div>
    ${
      d.workload
        ? `<div class="card"><h3>Carga por asesor (activas)</h3>
      ${d.workload.map((w) => `<div>${esc(w.name)}<div class="bar"><div style="width:${Math.min(100, w.c * 25)}%;background:var(--green)">${w.c}</div></div></div>`).join("")}</div>`
        : ""
    }
  </div>`;
}

/* ---------- Sales list ---------- */
async function vSales() {
  $("#view").innerHTML = `
  <div class="row" style="margin-bottom:.8rem"><h2 style="flex:3">Ventas</h2>
    <div><select id="fs"><option value="">Todos los estados</option><option value="active">Activas</option><option value="completed">Completadas</option><option value="cancelled">Canceladas</option></select></div>
    <div><input id="fq" placeholder="Buscar cliente, documento, modelo"></div>
    <div style="flex:0"><button class="btn" id="ns">+ Nueva</button></div>
  </div><div class="card" id="tbl"></div>`;
  const load = () =>
    safe(async () => {
      const d = await api("sales", {
        query: { status: $("#fs").value, q: $("#fq").value },
      });
      $("#tbl").innerHTML = d.sales.length
        ? `<table>
      <tr><th>#</th><th>Cliente</th><th>Vehículo</th><th>Asesor</th><th>Avance</th><th>Temp.</th><th>Estado</th></tr>
      ${d.sales
        .map(
          (
            s,
          ) => `<tr class="click" onclick="go('sale',${s.id})"><td>${s.id}</td>
        <td>${esc(s.cname)}<div class="muted">${esc(s.cdoc)}</div></td>
        <td>${esc(s.model)} ${esc(s.version)}<div class="muted">${esc(s.color)} · ${money(s.price_snapshot)}</div></td>
        <td>${esc(s.advisor)}</td><td>${s.done}/14${s.current_task ? `<div class="muted">Tarea ${s.current_task}</div>` : ""}</td>
        <td>${badge(s.temperature, TEMP[s.temperature])}</td><td>${badge(s.status, STATUS[s.status])}</td></tr>`,
        )
        .join("")}</table>`
        : '<p class="muted">No hay ventas con esos filtros.</p>';
    });
  $("#fs").onchange = load;
  $("#fq").oninput = load;
  $("#ns").onclick = () => go("newsale");
  load();
}

/* ---------- New sale ---------- */
async function vNewSale() {
  const [cu, cat, adv] = await Promise.all([
    api("customers"),
    api("catalog"),
    me.role !== "Sales Advisor" ? api("advisors") : { advisors: null },
  ]);
  if (!cu.customers.length) {
    toast("Primero registra un cliente", true);
    return go("customers");
  }
  $("#view").innerHTML = `
  <h2>Nueva venta</h2>
  <form class="card" id="nf">
    <label>Cliente</label>
    <select name="customer_id">${cu.customers.map((c) => `<option value="${c.id}">${esc(c.name)} (${c.doc_type} ${esc(c.doc_number)})</option>`).join("")}</select>
    <div class="row">
      <div><label>Modelo</label><select id="mo">${cat.models.map((m, i) => `<option value="${i}">${esc(m.name)} · ${esc(m.category)}</option>`).join("")}</select></div>
      <div><label>Versión</label><select name="version_id" id="ve"></select></div>
      <div><label>Color</label><select name="color_id" id="co"></select></div>
    </div>
    <div class="row">
      <div><label>Temperatura (probabilidad de cierre)</label><select name="temperature"><option value="Hot">Caliente</option><option value="Warm" selected>Tibia</option><option value="Cold">Fría</option></select></div>
      ${adv.advisors ? `<div><label>Asesor asignado</label><select name="advisor_id">${adv.advisors.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>` : ""}
    </div>
    <p class="muted">El precio de referencia de la versión se guarda como instantánea al crear la venta.</p>
    <button class="btn">Crear venta e iniciar proceso</button> <button type="button" class="btn sec" onclick="go('sales')">Cancelar</button>
  </form>`;
  const fill = () => {
    const m = cat.models[$("#mo").value];
    $("#ve").innerHTML = m.versions
      .map(
        (v) =>
          `<option value="${v.id}">${esc(v.name)} — ${money(v.reference_price)}</option>`,
      )
      .join("");
    $("#co").innerHTML = m.colors
      .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
      .join("");
  };
  $("#mo").onchange = fill;
  fill();
  $("#nf").onsubmit = (e) => {
    e.preventDefault();
    safe(async () => {
      const r = await api("sale_create", {
        body: Object.fromEntries(new FormData(e.target)),
      });
      toast("Venta creada");
      go("sale", r.id);
    });
  };
}

/* ---------- Sale detail ---------- */
async function vSale(id) {
  const d = await api("sale", { query: { id } });
  const s = d.sale,
    locked = s.status === "cancelled";
  const act = (t) => {
    if (locked) return "";
    if (t.status === "pending")
      return `<button class="btn sm" data-a="in_progress" data-n="${t.task_no}" ${t.blocked ? 'disabled title="Hay tareas previas sin completar"' : ""}>Iniciar</button>`;
    if (t.status === "in_progress")
      return `<button class="btn green sm" data-a="completed" data-n="${t.task_no}">Completar</button>`;
    return d.can_override
      ? `<button class="btn sec sm" data-a="in_progress" data-n="${t.task_no}">Reabrir</button>`
      : "";
  };
  $("#view").innerHTML = `
  <p><a href="#" onclick="go('sales');return false">← Ventas</a></p>
  <div class="card">
    <div class="row"><div style="flex:3"><h2>Venta #${s.id} · ${esc(s.customer_name_snapshot)}</h2>
      <div class="muted">${esc(s.customer_doc_type_snapshot)} ${esc(s.customer_doc_number_snapshot)} · creada ${dt(s.created_at)}</div></div>
      <div style="flex:0;white-space:nowrap">${badge(s.status, STATUS[s.status])} ${badge(s.temperature, TEMP[s.temperature])}</div></div>
    <p><b>${esc(s.model)} ${esc(s.version)}</b> · ${esc(s.color)} · precio ref. ${money(s.price_snapshot)}<br>
    <span class="muted">Asesor: ${esc(s.advisor_name)} · ${esc(s.advisor_email)} · ${esc(s.advisor_phone || "")}</span></p>
    ${s.status === "cancelled" ? `<div class="notice" style="background:#f3f3f3;border-color:#ddd">Cancelada. Motivo: ${esc(s.cancel_reason)}</div>` : ""}
    <div class="steps">${d.milestones.map((m) => `<div class="step ${m.state}"><i></i>${esc(m.name)}</div>`).join("")}</div>
    <p>${s.status === "active" ? '<button class="btn sec sm" id="cx">Cancelar venta</button>' : ""}
       ${s.status === "cancelled" && d.can_override ? '<button class="btn sm" id="ro">Deshacer cancelación</button>' : ""}</p>
  </div>
  <div class="card"><h3>Proceso de 14 tareas</h3>
    ${d.tasks
      .map(
        (
          t,
        ) => `<div class="task ${t.status} ${t.overdue && t.overdue_hours >= 48 ? "l3" : ""}">
      <div class="no">${t.task_no}</div>
      <div><b>${esc(t.name)}</b> ${badge(t.status, STATUS[t.status])}
        ${t.overdue ? badge("L" + (t.overdue_hours >= 48 ? 3 : t.overdue_hours >= 24 ? 2 : 1), "Vencida " + t.overdue_hours + " h") : ""}
        <div class="meta">${t.days ? `Duración recomendada: ${t.days} días` : "Sin duración definida"}
          ${t.deps.length ? ` · Depende de: ${t.deps.join(", ")}` : ""}
          ${t.started_at ? `<br>Inicio ${dt(t.started_at)}` : ""}${t.due_at ? ` · Vence ${dt(t.due_at)}` : ""}${t.completed_at ? ` · Completada ${dt(t.completed_at)}` : ""}</div>
        <textarea data-note="${t.task_no}" placeholder="Notas (opcional)" ${(t.status === "completed" && !d.can_override) || locked ? "disabled" : ""}>${esc(t.notes || "")}</textarea>
      </div>
      <div class="acts">${act(t)}</div></div>`,
      )
      .join("")}
  </div>
  <div class="card"><h3>Historial</h3>${d.audit.map((a) => `<div class="audit">${dt(a.created_at)} · ${esc(a.who)} · ${esc(a.detail)}</div>`).join("") || '<p class="muted">Sin eventos</p>'}</div>`;

  document.querySelectorAll("[data-a]").forEach(
    (b) =>
      (b.onclick = () => {
        const to = b.dataset.a,
          n = b.dataset.n;
        const msg =
          to === "completed"
            ? `¿Marcar la tarea ${n} como COMPLETADA? Luego solo un Gerente o Admin podrá modificarla.`
            : to === "in_progress" && b.textContent === "Reabrir"
              ? `¿Reabrir la tarea ${n}?`
              : `¿Iniciar la tarea ${n}?`;
        if (confirm(msg))
          safe(async () => {
            await api("task_set", { body: { sale_id: s.id, task_no: +n, to } });
            go("sale", s.id);
          });
      }),
  );
  document.querySelectorAll("[data-note]").forEach(
    (t) =>
      (t.onchange = () =>
        safe(async () => {
          await api("task_notes", {
            body: { sale_id: s.id, task_no: +t.dataset.note, notes: t.value },
          });
          toast("Nota guardada");
        })),
  );
  if ($("#cx"))
    $("#cx").onclick = () => {
      const reason = prompt("Motivo de la cancelación (obligatorio):");
      if (reason)
        safe(async () => {
          await api("sale_cancel", { body: { sale_id: s.id, reason } });
          go("sale", s.id);
        });
    };
  if ($("#ro"))
    $("#ro").onclick = () =>
      confirm("¿Deshacer la cancelación?") &&
      safe(async () => {
        await api("sale_reopen", { body: { sale_id: s.id } });
        go("sale", s.id);
      });
}

/* ---------- Customers ---------- */
async function vCustomers() {
  const d = await api("customers");
  $("#view").innerHTML = `
  <div class="row" style="margin-bottom:.8rem"><h2 style="flex:4">Clientes</h2><div style="flex:0"><button class="btn" id="nc">+ Nuevo cliente</button></div></div>
  <div id="cf"></div>
  <div class="card">${
    d.customers.length
      ? `<table><tr><th>Nombre</th><th>Tipo</th><th>Documento</th><th>Contacto</th></tr>
    ${d.customers.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.type)}</td><td>${c.doc_type} ${esc(c.doc_number)}</td><td>${esc(c.email)}<div class="muted">${esc(c.phone || "")}</div></td></tr>`).join("")}</table>`
      : '<p class="muted">Aún no hay clientes.</p>'
  }</div>`;
  $("#nc").onclick = () => {
    $("#cf").innerHTML = `<form class="card" id="cform">
      <div class="row">
        <div><label>Tipo de cliente</label><select name="type" id="ct">
          <option>Diplomático</option><option>Embajada</option><option>Entidad religiosa católica</option>
          <option>Entidad religiosa no católica</option><option>Organismo internacional</option></select></div>
        <div><label>Tipo de documento</label><select name="doc_type" id="cd"></select></div>
        <div><label>Número</label><input name="doc_number" required></div>
      </div>
      <label id="nl">Nombres y apellidos</label><input name="name" required>
      <div class="row">
        <div><label>Nacionalidad / país</label><input name="nationality"></div>
        <div><label>Contacto (B2B)</label><input name="contact_person" placeholder="Persona de contacto"></div>
        <div><label>Correo</label><input name="email" type="email" required></div>
        <div><label>Teléfono</label><input name="phone"></div>
      </div>
      <p><button class="btn">Crear cliente y cuenta</button></p></form>`;
    const sync = () => {
      const b2c = $("#ct").value === "Diplomático";
      $("#cd").innerHTML = (b2c ? ["DNI", "CE", "PAS", "CDI"] : ["RUC"])
        .map((x) => `<option>${x}</option>`)
        .join("");
      $("#nl").textContent = b2c ? "Nombres y apellidos" : "Razón social";
    };
    $("#ct").onchange = sync;
    sync();
    $("#cform").onsubmit = (e) => {
      e.preventDefault();
      safe(async () => {
        const r = await api("customer_create", {
          body: Object.fromEntries(new FormData(e.target)),
        });
        await vCustomers();
        $("#cf").innerHTML =
          `<div class="notice">Cliente creado. Contraseña temporal para el portal: <b>${esc(r.temp_password)}</b><br>
          <span class="muted">(En producción se enviaría por correo un enlace de activación; aquí se muestra solo para la demo.)</span></div>`;
      });
    };
  };
}

async function boot() {
  const r = await api("me").catch(() => ({ user: null }));
  me = r.user && r.user.type === "employee" ? r.user : null;
  if (!me) return renderLogin();
  renderShell();
  go("dashboard");
}
boot();
