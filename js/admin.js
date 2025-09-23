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
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
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
  // Auto-reset filtri quando si apre la tab Utenti
  if (tab === "users") {
    resetUserFiltersUI();
    saveUserFilters({});
    loadUsers();
  }

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
      <button class="btn" data-action="close-award" data-id="${ev._id}">Chiudi & premia</button>
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
    "close-award": `/events/${id}/close`,
 
  };
  try {
    if (action === "force-delete") {
      if (!confirm("Confermi l'eliminazione definitiva dell'evento?")) return;
      const res = await fetch(`${base}/admin/events/${id}/force`, { method: "DELETE", headers: { ...authHeaders(), "Content-Type": "application/json" } });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.ok) throw new Error(out?.error || "Force delete fallita");
      showAlert("Evento eliminato", "success");
    } else {
      // Azione speciale: chiusura evento + award ai partecipanti
      if (action === "close-award") {
        const res = await fetch(`${base}${pathMap[action]}`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out?.ok) throw new Error(out?.error || "Chiusura/award fallita");
        const awarded = (typeof out.awarded === "number") ? out.awarded : (out?.awarded ?? "?");
        showAlert(`Evento chiuso. Premi assegnati: ${awarded}`, "success");
        // Refresh KPI+lista e termina ramo
        await loadEvents();
        await loadKpis();
        return;
      }

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
const elUsReset = document.getElementById("usReset");
const elUsExport = document.getElementById("usExport");
let usRequestSeq = 0; // token anti-race per loadUsers
async function fetchUsers() {
  const base = apiBase();
const filters = readUserFiltersFromUI();
const q = {
q: filters.q || "",
role: filters.role || "",
canOrganize: (filters.canOrganize ?? "").toString(),
isBanned: (filters.isBanned ?? "").toString(),
status: filters.status || "",
scoreMin: Number.isFinite(filters.scoreMin) ? String(filters.scoreMin) : "",
scoreMax: Number.isFinite(filters.scoreMax) ? String(filters.scoreMax) : "",
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
  const statusRaw = String(u.status || "").toLowerCase();
  const statusLabel = statusRaw ? (statusRaw[0].toUpperCase() + statusRaw.slice(1)) : "";
  const score = Number.isFinite(u.score) ? u.score : (u.score || 0);
  const attended = (u?.stats?.attended || 0);
  const reviewsApproved = (u?.stats?.reviewsApproved || 0);
  card.innerHTML = `
    <h3>${u.name || "-"} <span class="muted">(${u.email || "-"})</span></h3>
    <div>${roleBadge} ${orgBadge} ${banBadge}</div>
    <div>
      ${statusRaw ? `<span class="chip status-chip chip-${statusRaw}">${statusLabel}</span>` : ""}
      <span class="muted"> • score: ${score} • attended: ${attended} • reviews: ${reviewsApproved}</span>
    </div>
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
const seq = ++usRequestSeq; // prendi un token progressivo
elUsList.innerHTML = "";
try {
const list = await fetchUsers();
if (seq !== usRequestSeq) return; // risposta superata: ignora
// Dedup per _id/id: ulteriore safety lato UI
const seen = new Set();
const uniq = [];
for (const u of (list || [])) {
const key = String(u?._id || u?.id || "");
if (!key) continue;
if (!seen.has(key)) { seen.add(key); uniq.push(u); }
}
// Applica filtri client-side (status, score, ecc.)
const filters = readUserFiltersFromUI();
saveUserFilters(filters);
const filtered = applyUserFilters(uniq, filters);

if (!filtered.length) {
  elUsList.appendChild(h("div", { class: "muted" }, "Nessun utente trovato."));
} else {
  filtered.forEach(u => elUsList.appendChild(renderUserCard(u)));
}

} catch (err) {
showAlert(err?.message || "Errore caricamento utenti", "error");
}
}

elUsReset?.addEventListener("click", () => {
  resetUserFiltersUI();
  saveUserFilters({});
  loadUsers();
});
elUsRefresh?.addEventListener("click", async () => { await loadUsers(); });
elUsExport?.addEventListener("click", async () => {
try {
const base = apiBase();
const filters = readUserFiltersFromUI();
const params = Object.entries(filters).reduce((acc, [k, v]) => {
if (v === null || v === undefined || v === "") return acc;
acc[k] = String(v);
return acc;
}, {});
const p = new URLSearchParams(params);
const url = `${base}/admin/users/export.csv?${p.toString()}`;

// Usa fetch con Authorization per evitare 401/UNAUTHORIZED
const res = await fetch(url, { headers: { ...authHeaders() } });
if (!res.ok) {
const err = await res.json().catch(() => ({}));
throw new Error(err?.error || "Errore export CSV");
}
const blob = await res.blob();
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = "users.csv";
document.body.appendChild(a);
a.click();
URL.revokeObjectURL(a.href);
a.remove();
} catch (err) {
showAlert(err?.message || "Errore export CSV", "error");
}
});

[elUsSearch, elUsRole, elUsOrg, elUsBan].forEach(el => {
  el?.addEventListener("change", () => { saveUserFilters(readUserFiltersFromUI()); loadUsers(); });
  el?.addEventListener("keyup", (e) => { if (e.key === "Enter") { saveUserFilters(readUserFiltersFromUI()); loadUsers(); } });
});
["usStatus","usScoreMin","usScoreMax"].forEach(id => {
  const el = document.getElementById(id);
  el?.addEventListener("change", () => { saveUserFilters(readUserFiltersFromUI()); loadUsers(); });
  el?.addEventListener("keyup", (e) => { if (e.key === "Enter") { saveUserFilters(readUserFiltersFromUI()); loadUsers(); } });
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
const elImpName = document.getElementById("impFileName");
elImpFile?.addEventListener("change", () => {
  const name = elImpFile?.files?.[0]?.name || "Nessun file selezionato";
  if (elImpName) elImpName.textContent = name + (elImpSim?.checked ? " (validazione)" : "");
});
elImpSim?.addEventListener("change", () => {
  if (!elImpName) return;
  const base = (elImpFile?.files?.[0]?.name || "Nessun file selezionato").replace(/\s*\(validazione\)$/i, "");
  elImpName.textContent = base + (elImpSim.checked ? " (validazione)" : "");
});

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
if (elImpRun) { elImpRun.disabled = true; elImpRun.dataset.loading = "1"; }
  const url = `${apiBase()}/admin/import/events`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders() }, // niente Content-Type manuale con FormData
      body: form,
    });
if (res.status === 401 || res.status === 403) {
    showAlert("Sessione scaduta o permessi insufficienti. Effettua di nuovo il login.", "error", { autoHideMs: 4000 });
    setTimeout(() => (window.location.href = "login.html"), 800);
    if (elImpRun) { elImpRun.disabled = false; elImpRun.dataset.loading = ""; }
    return;
  }
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.ok) throw new Error(out?.error || "Errore import");
// Riepilogo leggibile + JSON dettagli
    const created = out?.created ?? out?.stats?.created ?? 0;
    const updated = out?.updated ?? out?.stats?.updated ?? 0;
    const skipped = out?.skipped ?? out?.stats?.skipped ?? 0;
    const modeLabel = simulate ? "Validazione completata" : "Import completato";
    elImpLog.textContent =
      `${modeLabel}:\n- creati: ${created}\n- aggiornati: ${updated}\n- saltati: ${skipped}\n\nDettagli JSON:\n` +
      JSON.stringify(out, null, 2);
    showAlert(modeLabel, "success");
    if (elImpRun) { elImpRun.disabled = false; elImpRun.dataset.loading = ""; }
  } catch (err) {
    showAlert(err?.message || "Errore import", "error");
    if (elImpRun) { elImpRun.disabled = false; elImpRun.dataset.loading = ""; }
  }
});
// -------------------- Recensioni (tab) --------------------
const elRevList = document.getElementById("reviewsList");
const elRevRefresh = document.getElementById("revRefresh");
const elRevEvent = document.getElementById("revEvent");
async function fetchAllPending() {
  const base = apiBase();
  const url = `${base}/reviews/pending?_=${Date.now()}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.ok) throw new Error(out?.error || "Errore fetch recensioni");
  return out.reviews || [];
}

async function fetchPendingByEvent(eventId) {
  const base = apiBase();
  const url = `${base}/reviews?event=${encodeURIComponent(eventId)}&status=pending&_=${Date.now()}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.ok) throw new Error(out?.error || "Errore fetch recensioni per evento");
  return out.reviews || [];
}

function renderReviewCard(r) {
  const card = h("div", { class: "admin-card" });
  card.innerHTML = `
    <h3>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</h3>
    <div class="muted">${r.comment || "(nessun commento)"}</div>
    <div class="muted">Evento: ${r.event || "-"} • Utente: ${r.participant || "-"}</div>
    <div class="actions">
      <button class="btn primary" data-action="approve-review" data-id="${r._id}">Approva</button>
      <button class="btn" data-action="reject-review" data-id="${r._id}">Rifiuta</button>
    </div>
  `;
  return card;
}

async function loadReviews() {
  if (!elRevList) return;
  elRevList.innerHTML = "";
  try {
    const selected = elRevEvent?.value || "all";
    const list = selected === "all"
      ? await fetchAllPending()
      : await fetchPendingByEvent(selected);

    if (!list.length) {
      elRevList.appendChild(h("div", { class: "muted" }, "Nessuna recensione pending."));
    } else {
      list.forEach(r => elRevList.appendChild(renderReviewCard(r)));
    }
  } catch (err) {
    showAlert(err?.message || "Errore caricamento recensioni", "error");
  }
}

// Popola il select degli eventi (approvati)
async function populateReviewEvents() {
  if (!elRevEvent) return;
  const hasFilled = elRevEvent.options.length > 1;
  if (hasFilled) return;

  const base = apiBase();
  const url = `${base}/admin/events?approvalStatus=approved&limit=200&_=${Date.now()}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.ok) return;

  const evs = Array.isArray(out.events) ? out.events : [];
  evs.sort((a,b) => new Date(b.dateEnd || b.dateStart || 0) - new Date(a.dateEnd || a.dateStart || 0));

  for (const ev of evs) {
    const opt = document.createElement("option");
    opt.value = ev._id;
    opt.textContent = `${ev.title || "(senza titolo)"} — ${ev.city || ""} ${ev.region ? "("+ev.region+")":""}`;
    elRevEvent.appendChild(opt);
  }
}

// click handler tab recensioni
elRevEvent?.addEventListener("change", () => loadReviews());
elRevRefresh?.addEventListener("click", () => loadReviews());
elRevList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  const base = apiBase();
  try {
    const path = action === "approve-review"
      ? `/reviews/${id}/approve`
      : `/reviews/${id}/reject`;
    const res = await fetch(`${base}${path}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" }
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.ok) throw new Error(out?.error || "Errore moderazione review");
    showAlert(`Review ${action.includes("approve") ? "approvata" : "rifiutata"}`, "success");
    await loadReviews();
  } catch (err) {
    showAlert(err?.message || "Errore azione review", "error");
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
// Wire: Logout admin
  const btnLogout = document.getElementById("btnAdminLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      try {
        // Rimuovi token e varianti comuni
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("jwt");
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("desiredRole");

        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("jwt");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("desiredRole");
      } catch {}

      // Redirect a login
      window.location.href = "login.html";
    });
  }

  // default tab events
await restoreUserFiltersUI();
await Promise.all([loadKpis(), loadEvents(), loadUsers?.()]);
await populateReviewEvents();
await loadReviews();
}
document.addEventListener("DOMContentLoaded", boot);
// -------------------- Users Filters (client-side) --------------------
function readUserFiltersFromUI() {
  const g = (id) => document.getElementById(id);
  const val = (el) => (el && typeof el.value === "string") ? el.value.trim() : "";
  const num = (el) => {
    const s = val(el);
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    q: val(g("usSearch")),
    role: val(g("usRole")),
    canOrganize: val(g("usOrg")),
    isBanned: val(g("usBan")),
    status: val(g("usStatus")).toLowerCase(),
    scoreMin: num(g("usScoreMin")),
    scoreMax: num(g("usScoreMax")),
  };
}

function saveUserFilters(filters) {
  try { localStorage.setItem("ADMIN_USERS_FILTERS", JSON.stringify(filters || {})); } catch {}
}

async function restoreUserFiltersUI() {
  try {
    const raw = localStorage.getItem("ADMIN_USERS_FILTERS");
    if (!raw) return;
    const f = JSON.parse(raw);
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (v === undefined || v === null) return;
      el.value = String(v);
    };
    set("usSearch", f.q ?? "");
    set("usRole", f.role ?? "");
    set("usOrg", f.canOrganize ?? "");
    set("usBan", f.isBanned ?? "");
    set("usStatus", f.status ?? "");
    set("usScoreMin", f.scoreMin ?? "");
    set("usScoreMax", f.scoreMax ?? "");
  } catch {}

}
function resetUserFiltersUI() {
  const ids = ["usSearch","usRole","usOrg","usBan","usStatus","usScoreMin","usScoreMax"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "SELECT") {
      el.value = "";
    } else {
      el.value = "";
    }
  });
  try { localStorage.removeItem("ADMIN_USERS_FILTERS"); } catch {}
}

function applyUserFilters(list, f) {
  const txt = (s) => String(s || "").toLowerCase();
  return (list || []).filter(u => {
    if (f.q) {
      const hay = txt(u.name) + " " + txt(u.email);
      if (!hay.includes(txt(f.q))) return false;
    }
    if (f.role && txt(u.role) !== txt(f.role)) return false;
    if (f.canOrganize !== "" && String(!!u.canOrganize) !== (f.canOrganize === "true" ? "true" : "false")) return false;
    if (f.isBanned !== "" && String(!!u.isBanned) !== (f.isBanned === "true" ? "true" : "false")) return false;
    if (f.status && txt(u.status) !== txt(f.status)) return false;

    const score = Number(u.score || 0);
    if (Number.isFinite(f.scoreMin) && score < f.scoreMin) return false;
    if (Number.isFinite(f.scoreMax) && score > f.scoreMax) return false;

    return true;
  });
}
