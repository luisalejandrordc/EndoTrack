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
    ? new Date(s.replace(" ", "T")).toLocaleDateString("es-PE", {
        dateStyle: "long",
      })
    : "";
const STATUS = {
  active: "En proceso",
  completed: "Entregada",
  cancelled: "Cancelada",
};
const MS_TXT = {
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Completado",
};

async function api(action, body) {
  const r = await fetch(
    "api.php?action=" + action,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const d = await r.json().catch(() => ({ error: "Respuesta inválida" }));
  if (!r.ok) {
    const e = new Error(d.error || "Error");
    e.status = r.status;
    throw e;
  }
  return d;
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast err";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function renderLogin() {
  $("#app").innerHTML = `
  <div class="login card">
    <h2 class="brand">Grupo <span>Pana</span></h2>
    <p class="muted">Portal de seguimiento de tu vehículo</p>
    <form id="lf">
      <label>Tipo de documento</label>
      <select name="doc_type"><option>DNI</option><option>CE</option><option>RUC</option><option>PAS</option><option>CDI</option></select>
      <label>Número de documento</label><input name="doc_number" required autocomplete="username">
      <label>Contraseña</label><input name="password" type="password" required autocomplete="current-password">
      <p><button class="btn" style="width:100%">Ingresar</button></p>
    </form>
    <p class="muted" style="font-size:.8rem">Demo: CE 001234567 / cliente123 · RUC 20123456789 / cliente123</p>
  </div>`;
  $("#lf").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("login", {
        ...Object.fromEntries(new FormData(e.target)),
        portal: true,
      });
      boot();
    } catch (err) {
      toast(err.message);
    }
  };
}

async function renderHome() {
  const d = await api("portal_sales");
  $("#app").innerHTML = `
  <header class="topbar"><div class="brand">Grupo <span>Pana</span> · Mi portal</div><nav></nav>
    <div class="who">${esc(d.customer)}</div><button class="btn sec sm" id="lo">Salir</button></header>
  <main>
    <h2>Mis compras</h2>
    ${
      d.sales
        .map(
          (s) => `<div class="card">
      <div class="row"><div style="flex:3"><h3>${esc(s.model)} ${esc(s.version)}</h3>
        <div class="muted">${esc(s.color)} · ${esc(s.category)} · Precio de referencia ${money(s.price_snapshot)}<br>Solicitud #${s.id} del ${dt(s.created_at)}</div></div>
        <div style="flex:0"><span class="badge b-${s.status}">${STATUS[s.status]}</span></div></div>
      <div class="steps">${s.milestones.map((m) => `<div class="step ${m.state}"><i></i>${esc(m.name)}<br><small>${MS_TXT[m.state]}</small></div>`).join("")}</div>
      <p class="muted" style="margin-bottom:0">Tu asesor: <b>${esc(s.advisor_name)}</b> · ${esc(s.advisor_email)} · ${esc(s.advisor_phone || "")}</p>
    </div>`,
        )
        .join("") ||
      '<div class="card muted">Aún no tienes compras registradas.</div>'
    }
  </main>`;
  $("#lo").onclick = async () => {
    await api("logout");
    boot();
  };
}

async function boot() {
  const r = await api("me").catch(() => ({ user: null }));
  if (r.user && r.user.type === "customer")
    renderHome().catch(() => renderLogin());
  else renderLogin();
}
boot();
