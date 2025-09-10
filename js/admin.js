// frontend/js/admin.js
// Admin Dashboard (Eventi, Utenti, Import Massivo)
// Requisiti: utente loggato con ruolo admin (JWT nel sessionStorage)

import { apiGet, apiPost, apiDelete, apiPut, whoami } from "./api.js"; // PATCH: aggiunto whoami

// -------------------- Helpers base --------------------
function apiBase() {
  // Opzione B: proxy relativo /api
return "/api";

}

function getToken() {
  // 1) sessionStorage: nomi più comuni
  try {
    const direct =
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("jwt") ||
      sessionStorage.getItem("accessToken");
    if (direct) return direct;
  } catch {}

  // 2) localStorage fallback: stessi nomi
  try {
    const directLocal =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("accessToken");
    if (directLocal) return directLocal;
  } catch {}

  // 3) session/local: oggetti noti (user/access)
  const tryParse = (raw) => { try { return JSON.parse(raw); } catch { return null; } };
  try {
    const userSS = tryParse(sessionStorage.getItem("user"));
    if (userSS?.token) return userSS.token;
    if (userSS?.accessToken) return userSS.accessToken;
  } catch {}
  try {
    const userLS = tryParse(localStorage.getItem("user"));
    if (userLS?.token) return userLS.token;
    if (userLS?.accessToken) return userLS.accessToken;
  } catch {}

  // 4) Scansione chiavi: se troviamo qualcosa che "sembra" un JWT, usalo
  const looksLikeJwt = (v) => typeof v === "string" && v.split(".").length === 3 && v.length > 20;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      const v = sessionStorage.getItem(k);
      if (looksLikeJwt(v)) return v;
      const parsed = tryParse(v);
      if (looksLikeJwt(parsed?.token)) return parsed.token;
      if (looksLikeJwt(parsed?.accessToken)) return parsed.accessToken;
    }
  } catch {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k);
      if (looksLikeJwt(v)) return v;
      const parsed = tryParse(v);
      if (looksLikeJwt(parsed?.token)) return parsed.token;
      if (looksLikeJwt(parsed?.accessToken)) return parsed.accessToken;
    }
  } catch {}

  return "";
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).filter(Boolean).forEach(c => {
    if (typeof c === "string") el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  });
  return el;
}
function fmtDate(d) {
  if (!d) return "-";
  try { return new Date(d).toLocaleString("it-IT"); } catch { return String(d); }
}
function badge(status) {
  const s = String(status || "").toLowerCase();
  const known = new Set(["approved", "pending", "rejected", "blocked", "-"]);
  const label = s && known.has(s) ? s : "-";
  const cls = ["badge", label].join(" ");
  return `<span class="${cls}">${label}</span>`;
}
function showAlert(msg, type = "info", { autoHideMs = 2500 } = {}) {
  let box = document.getElementById("adminAlert");
  if (!box) {
    box = h("div", { id: "adminAlert", class: "admin-card" });
    document.body.appendChild(box);
    box.style.position = "fixed";
    box.style.right = "1rem";
    box.style.bottom = "1rem";
    box.style.maxWidth = "360px";
    box.style.zIndex = 9999;
    box.style.boxShadow = "0 6px 24px rgba(0,0,0,.12)";
  }
  box.innerHTML = `<strong>${type.toUpperCase()}</strong><div>${msg}</div>`;
  box.style.borderLeft = `4px solid ${type === "error" ? "#e00" : type === "success" ? "#0a0" : "#111"}`;
  if (autoHideMs) setTimeout(() => { box.remove(); }, autoHideMs);
}

// -------------------- Tabs --------------------
const tabs = document.getElementById("adminTabs");
const panels = [...document.querySelectorAll("[data-tab-panel]")];
tabs?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (!btn) return;
  tabs.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === btn));
  const tab = btn.getAttribute("data-tab");
  panels.forEach(p => p.hidden = p.getAttribute("data-tab-panel") !== tab);
});

// -------------------- KPI --------------------
async function loadKpis() {
  // Usiamo la lista admin events con conteggio per stato
  const token = getToken();
  const base = apiBase();
  const url = `${base}/admin/events?approvalStatus=&_=${Date.now()}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.ok) { showAlert(out?.error || "Errore KPI", "error"); return; }
  const counts = { pending:0, approved:0, rejected:0, blocked:0 };
  (out.events || []).forEach(ev => { counts[ev.approvalStatus] = (counts[ev.approvalStatus]||0)+1; });
  document.getElementById("kpiPending").textContent = counts.pending;
  document.getElementById("kpiApproved").textContent = counts.approved;
  document.getElementById("kpiRejected").textContent = counts.rejected;
  document.getElementById("kpiBlocked").textContent = counts.blocked;
}

// -------------------- Eventi (tab) --------------------
const elEvSearch = document.getElementById("evSearch");
const elEvStatus = document.getElementById("evStatus");
const elEvVisibility = document.getElementById("evVisibility");
const elEvList = document.getElementById("eventsList");
const elEvRefresh = document.getElementById("evRefresh");

let evRequestSeq = 0; // token anti-race per loadEvents
function qParams(obj) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k,v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  });
  return p.toString();
}

async function fetchEvents() {
  const base = apiBase();
  const q = {
    q: elEvSearch?.value?.trim() || "",
    approvalStatus: (elEvStatus?.value || "").toLowerCase(),
    visibility: (elEvVisibility?.value || "").toLowerCase(),
  };
  const url = `${base}/admin/events?${qParams(q)}&_=${Date.now()}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.ok) throw new Error(out?.error || "Errore fetch eventi");
  return out.events || [];
}

function renderEventCard(ev) {
  const card = h("div", { class: "admin-card" });

  // PATCH: normalizza status/visibility, niente default a "approved"
  const st = (ev.approvalStatus ?? ev.status ?? "").toLowerCase() || "-";
  const vis = (ev.visibility ?? "").toLowerCase() || "-";

  card.innerHTML = `
    <h3>${ev.title || "-"}</h3>
    <div class="muted">${ev.city || "-"}, ${ev.region || "-"}, ${ev.country || "-"}</div>
    <div>${badge(st)} <span class="muted">•</span> ${vis} <span class="muted">•</span> ${fmtDate(ev.dateStart)} → ${fmtDate(ev.dateEnd)}</div>
    <div class="actions">
      <button class="btn" data-action="approve" data-id="${ev._id}">Approve</button>
      <button class="btn" data-action="reject" data-id="${ev._id}">Reject</button>
      <button class="btn" data-action="block" data-id="${ev._id}">Block</button>
      <button class="btn" data-action="unblock" data-id="${ev._id}">Unblock</button>
      <button class="btn" data-action="force-delete" data-id="${ev._id}">Force Delete</button>
    </div>
  `;
  return card;
}

async function loadEvents() {
const seq = ++evRequestSeq; // prendi un token progressivo
elEvList.innerHTML = "";
  try {
    const list = await fetchEvents();
   // Dedup per _id/id: evita duplicati quando il filtro matcha più campi lato BE
    if (seq !== evRequestSeq) return; // risposta superata: ignora

const seen = new Set();
const uniq = [];
for (const ev of (list || [])) {
const key = String(ev?._id || ev?.id || "");
if (!key) continue;
if (!seen.has(key)) { seen.add(key); uniq.push(ev); }
}
if (!uniq.length) {
elEvList.appendChild(h("div", { class: "muted" }, "Nessun evento trovato."));
} else {
uniq.forEach(ev => elEvList.appendChild(renderEventCard(ev)));
}
  } catch (err) {
    showAlert(err?.message || "Errore caricamento eventi", "error");
  }
}

elEvRefresh?.addEventListener("click", async () => {
await loadEvents();
await loadKpis();
});
[elEvSearch, elEvStatus, elEvVisibility].forEach(el => {
el?.addEventListener("change", () => elEvRefresh?.click());
el?.addEventListener("keyup", (e) => { if (e.key === "Enter") elEvRefresh?.click(); });
});

elEvList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  const base = apiBase();
  const pathMap = {
    "approve": `/admin/events/${id}/approve`,
    "reject": `/admin/events/${id}/reject`,
    "block": `/admin/events/${id}/block`,
    "unblock": `/admin/events/${id}/unblock`,
  };
  try {
    if (action === "force-delete") {
      if (!confirm("Confermi l'eliminazione definitiva dell'evento?")) return;
      const res = await fetch(`${base}/admin/events/${id}/force`, { method: "DELETE", headers: { ...authHeaders(), "Content-Type": "application/json" } });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) throw new Error(out?.error || "Force delete fallita");
      showAlert("Evento eliminato", "success");
    } else {
      let body = {};
      if (action === "reject") {
        const reason = prompt("Motivo del rifiuto:");
        if (!reason || !reason.trim()) { showAlert("Motivo obbligatorio", "error"); return; }
        body.reason = reason.trim();
      }
      if (action === "block") {
        const reason = prompt("Motivo del blocco:");
        if (!reason || !reason.trim()) { showAlert("Motivo obbligatorio", "error"); return; }
        body.reason = reason.trim();
}
// su approve / unblock azzeri motivo/notes per evitare che rimanga quello precedente
if (action === "approve" || action === "unblock") {
body.reason = "";
body.notes = "";
}

      const res = await fetch(`${base}${pathMap[action]}`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) throw new Error(out?.error || "Azione fallita");
      showAlert("Azione completata", "success");
    }
    // Refresh
    await loadEvents();
    await loadKpis();
  } catch (err) {
    showAlert(err?.message || "Errore azione admin", "error");
  }
});

// -------------------- Utenti (tab) --------------------
const elUsSearch = document.getElementById("usSearch");
const elUsRole = document.getElementById("usRole");
const elUsOrg = document.getElementById("usOrg");
const elUsBan = document.getElementById("usBan");
const elUsList = document.getElementById("usersList");
const elUsRefresh = document.getElementById("usRefresh");

async function fetchUsers() {
  const base = apiBase();
  const q = {
    q: elUsSearch?.value?.trim() || "",
    role: elUsRole?.value || "",
    canOrganize: elUsOrg?.value || "",
    isBanned: elUsBan?.value || "",
  };
  const url = `${base}/admin/users?${qParams(q)}&_=${Date.now()}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.ok) throw new Error(out?.error || "Errore fetch utenti");
  return out.users || [];
}

function renderUserCard(u) {
  const card = h("div", { class: "admin-card" });
  const roleBadge = `<span class="badge">${u.role}</span>`;
  const orgBadge = `<span class="badge ${u.canOrganize ? "approved" : "blocked"}">${u.canOrganize ? "canOrganize" : "noOrganize"}</span>`;
  const banBadge = `<span class="badge ${u.isBanned ? "blocked" : "approved"}">${u.isBanned ? "banned" : "active"}</span>`;
  card.innerHTML = `
    <h3>${u.name || "-"} <span class="muted">(${u.email || "-"})</span></h3>
    <div>${roleBadge} ${orgBadge} ${banBadge}</div>
    <div class="actions">
      <button class="btn" data-action="ban" data-id="${u._id}">Ban</button>
      <button class="btn" data-action="unban" data-id="${u._id}">Unban</button>
      <button class="btn" data-action="role" data-id="${u._id}" data-role="participant">Set Participant</button>
      <button class="btn" data-action="role" data-id="${u._id}" data-role="organizer">Set Organizer</button>
      <button class="btn" data-action="role" data-id="${u._id}" data-role="admin">Set Admin</button>
      <button class="btn" data-action="org" data-id="${u._id}" data-value="true">Can Organize: ON</button>
      <button class="btn" data-action="org" data-id="${u._id}" data-value="false">Can Organize: OFF</button>
    </div>
  `;
  return card;
}

async function loadUsers() {
  elUsList.innerHTML = "";
  try {
    const list = await fetchUsers();
    if (!list.length) {
      elUsList.appendChild(h("div", { class: "muted" }, "Nessun utente trovato."));
    } else {
      list.forEach(u => elUsList.appendChild(renderUserCard(u)));
    }
  } catch (err) {
    showAlert(err?.message || "Errore caricamento utenti", "error");
  }
}

elUsRefresh?.addEventListener("click", async () => { await loadUsers(); });

[elUsSearch, elUsRole, elUsOrg, elUsBan].forEach(el => {
  el?.addEventListener("change", () => elUsRefresh?.click());
  el?.addEventListener("keyup", (e) => { if (e.key === "Enter") elUsRefresh?.click(); });
});

elUsList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  const base = apiBase();
  try {
    if (action === "ban" || action === "unban") {
      const path = `/admin/users/${id}/${action}`;
      const res = await fetch(`${base}${path}`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" } });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) throw new Error(out?.error || "Azione fallita");
      showAlert(`${action.toUpperCase()} ok`, "success");
    } else if (action === "role") {
      const role = btn.getAttribute("data-role");
      const res = await fetch(`${base}/admin/users/${id}/role`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) throw new Error(out?.error || "Cambio ruolo fallito");
      showAlert(`Ruolo impostato: ${role}`, "success");
    } else if (action === "org") {
      const value = btn.getAttribute("data-value") === "true";
      const res = await fetch(`${base}/admin/users/${id}/can-organize`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) throw new Error(out?.error || "Toggle canOrganize fallito");
      showAlert(`canOrganize: ${value ? "ON" : "OFF"}`, "success");
    }
    await loadUsers();
  } catch (err) {
    showAlert(err?.message || "Errore azione utente", "error");
  }
});

// -------------------- Import Massivo (tab) --------------------
const elImpFile = document.getElementById("impFile"); // PATCH: nuovo
const elImpSim = document.getElementById("impSimulate");
const elImpRun = document.getElementById("impRun");
const elImpLog = document.getElementById("importLog");

elImpRun?.addEventListener("click", async () => {
  const simulate = !!elImpSim?.checked;
  const file = elImpFile?.files?.[0];
  if (!file) {
    showAlert("Seleziona un file CSV", "error");
    return;
  }

  // PATCH: usa FormData (niente Content-Type manuale)
  const form = new FormData();
  form.append("file", file);
  form.append("simulate", simulate ? "true" : "false");

  const url = `${apiBase()}/admin/import/events`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders() }, // niente Content-Type manuale con FormData
      body: form,
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.ok) throw new Error(out?.error || "Errore import");
    elImpLog.textContent = JSON.stringify(out, null, 2);
    showAlert("Import eseguito", "success");
  } catch (err) {
    showAlert(err?.message || "Errore import", "error");
  }
});

// -------------------- Boot --------------------
async function boot() {
  // check token
  const t = getToken();
  if (!t) {
    showAlert("Sessione non valida. Effettua login come admin.", "error", { autoHideMs: 4000 });
    setTimeout(() => (window.location.href = "login.html"), 800);
    return;
  }

  // PATCH: verifica ruolo lato server (whoami) prima di caricare la dashboard
  try {
    const me = await whoami(t);
    if (!me?.ok || !me?.user || String(me.user.role).toLowerCase() !== "admin") {
      showAlert("Accesso riservato agli amministratori.", "error", { autoHideMs: 4000 });
      setTimeout(() => (window.location.href = "login.html"), 800);
      return;
    }
  } catch {
    showAlert("Verifica permessi non riuscita. Effettua nuovamente il login.", "error", { autoHideMs: 4000 });
    setTimeout(() => (window.location.href = "login.html"), 800);
    return;
  }

  // default tab events
  await Promise.all([loadKpis(), loadEvents()]);
}
document.addEventListener("DOMContentLoaded", boot);

