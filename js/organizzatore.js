// ---- Helpers base ----
const API_BASE = ""; // vuoto perché Netlify proxy /api → backend; se servi statico, metti qui l'URL Render
const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

// ---- GUARD compat: non mandare al login mentre sto cambiando ruolo ----
(function guardOrganizzatore(){
  const switching = localStorage.getItem("switchingRole") === "1";
  if (switching) return;

  const userId = getUserId();
  const role = localStorage.getItem("role") || localStorage.getItem("currentRole");
  const orgFlag = sessionStorage.getItem("organizzatoreLoggato") === "true";

  if (!userId) { location.href = "/login.html"; return; }
  if (role !== "organizer" && !orgFlag) {
    location.href = "/partecipante.html";
    return;
  }
})();

document.addEventListener("DOMContentLoaded", () => { initOrganizzatore().catch(console.error); });

async function initOrganizzatore() {
  const listEl = document.getElementById("event-list");
  const logoutBtn = document.getElementById("logout-btn");
  const creaBtn = document.getElementById("crea-btn");

  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    location.href = "/";
  });
  if (creaBtn) creaBtn.addEventListener("click", createEvent);

  // modal setup
  setupEditModal();

  await refreshList(listEl);
}

async function refreshList(container) {
  const events = await fetchJSON("/api/events");
  renderEvents(container, events);
}

// ---- CREATE ----
async function createEvent() {
  const title = document.getElementById("titolo").value.trim();
  const description = document.getElementById("descrizione").value.trim();
  const dt = document.getElementById("data").value; // datetime-local
  const location = document.getElementById("luogo").value.trim();

  if (!title || !dt || !location) {
    alert("Titolo, Data e Luogo sono obbligatori.");
    return;
  }

  const body = {
    title,
    description,
    date: new Date(dt).toISOString(),
    location
  };

  const r = await fetch(API_BASE + "/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const msg = await r.text();
    alert("Errore creazione evento: " + msg);
    return;
  }
  // pulizia form
  document.getElementById("titolo").value = "";
  document.getElementById("descrizione").value = "";
  document.getElementById("data").value = "";
  document.getElementById("luogo").value = "";

  await refreshList(document.getElementById("event-list"));
}

// ---- DELETE ----
async function deleteEvent(id) {
  const r = await fetch(API_BASE + `/api/events/${id}`, {
    method: "DELETE",
    headers: {
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    }
  });
  if (!r.ok) {
    const msg = await r.text().catch(()=> "Errore eliminazione evento");
    alert(msg);
    return;
  }
  await refreshList(document.getElementById("event-list"));
}

// ---- EDIT (modal) ----
let editingId = null;

function setupEditModal() {
  const backdrop = document.getElementById("edit-backdrop");
  const btnCancel = document.getElementById("edit-cancel");
  const btnSave = document.getElementById("edit-save");

  btnCancel.addEventListener("click", () => closeEditModal());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeEditModal();
  });
  btnSave.addEventListener("click", saveEditModal);
}

function openEditModal(ev) {
  editingId = ev._id;

  // precompila
  document.getElementById("edit-title-input").value = ev.title || "";
  document.getElementById("edit-desc-input").value = ev.description || "";
  // normalizza la data per input datetime-local
  try {
    const d = new Date(ev.date);
    document.getElementById("edit-date-input").value = isNaN(d.getTime()) ? "" : new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  } catch { document.getElementById("edit-date-input").value = ""; }
  document.getElementById("edit-loc-input").value = ev.location || "";

  document.getElementById("edit-backdrop").style.display = "flex";
}

function closeEditModal() {
  editingId = null;
  document.getElementById("edit-backdrop").style.display = "none";
}

async function saveEditModal() {
  if (!editingId) return;

  const title = document.getElementById("edit-title-input").value.trim();
  const description = document.getElementById("edit-desc-input").value.trim();
  const dt = document.getElementById("edit-date-input").value;
  const location = document.getElementById("edit-loc-input").value.trim();

  const patch = {};
  if (title) patch.title = title;
  if (description || description === "") patch.description = description;
  if (dt) patch.date = new Date(dt).toISOString();
  if (location) patch.location = location;

  const r = await fetch(API_BASE + `/api/events/${editingId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: JSON.stringify(patch)
  });

  if (!r.ok) {
    const msg = await r.text().catch(()=> "Errore salvataggio");
    alert(msg);
    return;
  }

  closeEditModal();
  await refreshList(document.getElementById("event-list"));
}

// ---- Fetch util ----
async function fetchJSON(url) {
  const r = await fetch(API_BASE + url, {
    headers: {
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} su ${url}`);
  return r.json();
}

function renderEvents(container, events) {
  if (!container) return;
  container.innerHTML = "";
  if (!events || events.length === 0) {
    container.innerHTML = "<p>Nessun evento trovato.</p>";
    return;
  }

  const myId = getUserId();
  const ul = document.createElement("ul");
  ul.className = "events";

  events.forEach(ev => {
    const mine = String(ev.organizerId) === String(myId);
    const li = document.createElement("li");

    const title = `<strong>${safe(ev.title)}</strong>`;
    const meta = `<span class="meta">– ${fmtDate(ev.date)} <em>${safe(ev.location)}</em></span>`;
    const actions = mine
      ? `<span class="actions">
          <button data-edit="${ev._id}">✏️ Modifica</button>
          <button data-del="${ev._id}">🗑️ Elimina</button>
        </span>`
      : "";

    li.innerHTML = `${title} ${meta} ${actions}`;
    ul.appendChild(li);
  });
  container.appendChild(ul);

  // bind edit/delete solo sui miei eventi
  container.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deleteEvent(btn.getAttribute("data-del")));
  });
  container.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      // carico il dettaglio per sicurezza (così prendo ultimo stato)
      const ev = await fetchJSON(`/api/events/${id}`);
      openEditModal(ev);
    });
  });
}

function safe(v, d="—"){ return (v===undefined||v===null||v==="") ? d : String(v); }
function fmtDate(v){
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return safe(v);
    return d.toLocaleString("it-IT", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  } catch { return safe(v); }
}

// === Role Switcher: ora usa Authorization e aggiorna token ===
(function setupRoleSwitcher(){
  const btn =
    document.getElementById("cambia-ruolo-btn") ||
    document.querySelector('[data-action="switch-role"]');

  if (!btn) return;

  try { btn.setAttribute("onclick", ""); } catch {}
  btn.type = "button";
  const clone = btn.cloneNode(true);
  btn.parentNode.replaceChild(clone, btn);
  const switchBtn = clone;

  switchBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    const userId = getUserId();
    const current =
      localStorage.getItem("role") ||
      localStorage.getItem("currentRole") ||
      "participant";
    const next = current === "organizer" ? "participant" : "organizer";

    if (!userId) { location.href = "/"; return; }

    try {
      localStorage.setItem("switchingRole", "1");

      const r = await fetch(API_BASE + `/api/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        },
        body: JSON.stringify({ role: next })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Errore cambio ruolo (${r.status})`);

      // ⬇️ backend risponde { token, role }
      if (data.token) localStorage.setItem("token", data.token);
      const newRole = data.role || next;

      // chiavi “EN”
      localStorage.setItem("role", newRole);
      localStorage.setItem("currentRole", newRole);

      // legacy IT
      const itRole = (newRole === "organizer") ? "organizzatore" : "partecipante";
      localStorage.setItem("userRole", itRole);
      if (newRole === "organizer") {
        sessionStorage.setItem("organizzatoreLoggato", "true");
        sessionStorage.setItem("partecipanteLoggato", "");
      } else {
        sessionStorage.setItem("partecipanteLoggato", "true");
        sessionStorage.setItem("organizzatoreLoggato", "");
      }

      // utenteCorrente
      try {
        const raw = sessionStorage.getItem("utenteCorrente");
        const u = raw ? JSON.parse(raw) : {};
        u.role = newRole;
        u.currentRole = newRole;
        u.ruolo = itRole;
        sessionStorage.setItem("utenteCorrente", JSON.stringify(u));
      } catch {}

      // redirect coerente
      if (newRole === "organizer") {
        location.href = "/organizzatore.html";
      } else {
        location.href = "/partecipante.html";
      }
    } catch (err) {
      alert(err.message || "Errore cambio ruolo");
    }
  }, { capture: true });
})();

