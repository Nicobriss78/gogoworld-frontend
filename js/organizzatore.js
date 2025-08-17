// === GoGo.World — Area Organizzatore ===
// Versione allineata a organizzatore.html (ID reali):
// Form: titolo, descrizione, data, luogo, crea-btn
// Lista: event-list
// Azioni globali: logout-btn, cambia-ruolo-btn
// Modal edit: edit-backdrop, edit-title-input, edit-desc-input, edit-date-input, edit-loc-input, edit-cancel, edit-save

/* ===================== Config ===================== */
const API_BASE = "https://gogoworld-api.onrender.com";
const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");
const getRole = () => localStorage.getItem("role") || localStorage.getItem("currentRole");

/* ===================== Guard ===================== */
(function guardOrganizzatore() {
  const switching = localStorage.getItem("switchingRole") === "1";
  if (switching) return;
  const uid = getUserId();
  const tok = getToken();
  if (!uid || !tok) {
    location.href = "/login.html";
    return;
  }
  // Nota: consentiamo lo switch di ruolo senza forzare il role=organizer
})();

/* ===================== Init ===================== */
document.addEventListener("DOMContentLoaded", () => {
  bindUi();
  loadEvents();
});

/* ===================== UI Bindings ===================== */
function bindUi() {
  byId("crea-btn")?.addEventListener("click", onCreate);
  byId("event-list")?.addEventListener("click", onListClick);
  byId("logout-btn")?.addEventListener("click", onLogout);
  byId("cambia-ruolo-btn")?.addEventListener("click", onSwitchRole);

  // Modal edit
  byId("edit-cancel")?.addEventListener("click", closeEditModal);
  byId("edit-save")?.addEventListener("click", onSaveEdit);
}

/* ===================== Data Load ===================== */
async function loadEvents() {
  try {
    const r = await fetch(`${API_BASE}/api/events`);
    const data = await r.json();
    const events = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);
    renderEvents(events);
  } catch (err) {
    console.error("loadEvents error:", err);
    alert("Errore nel caricamento eventi");
  }
}

/* ===================== Render List ===================== */
function renderEvents(events) {
  const list = byId("event-list");
  if (!list) return;
  list.innerHTML = "";

  const myId = getUserId();

  events.forEach(ev => {
    const li = document.createElement("div");
    li.className = "event-row";
    const mine = String(ev.organizerId) === String(myId);

    li.innerHTML = `
      <div class="row">
        <div><strong>${escapeHtml(safe(ev.title))}</strong></div>
        <div>${escapeHtml(safe(ev.date))}, ${escapeHtml(safe(ev.location))}</div>
        <div class="desc" style="margin:4px 0;">${escapeHtml(safe(ev.description, ""))}</div>
        <div class="actions">
          ${ mine ? `<button class="edit-btn" data-id="${ev._id}">Modifica</button>
                     <button class="del-btn" data-id="${ev._id}">Elimina</button>` : "" }
        </div>
      </div>
      <hr/>
    `;
    list.appendChild(li);
  });
}

/* ===================== Create ===================== */
async function onCreate() {
  const title = val("titolo").trim();
  const description = val("descrizione").trim();
  const date = val("data").trim();
  const location = val("luogo").trim();

  if (!title) { alert("Titolo obbligatorio"); return; }

  try {
    const r = await fetch(`${API_BASE}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ title, description, date, location })
    });

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      alert(e.error || "Errore creazione evento");
      return;
    }

    // reset form
    setVal("titolo", "");
    setVal("descrizione", "");
    setVal("data", "");
    setVal("luogo", "");

    await loadEvents();
  } catch (err) {
    console.error("onCreate error:", err);
    alert("Errore di rete");
  }
}

/* ===================== Edit / Delete (lista) ===================== */
let editingEventId = null;

function onListClick(e) {
  const t = e.target;
  if (t.classList.contains("edit-btn")) {
    const id = t.getAttribute("data-id");
    openEditModal(id);
  } else if (t.classList.contains("del-btn")) {
    const id = t.getAttribute("data-id"); // ID corretto
    onDelete(id);
  }
}

async function onDelete(id) {
  if (!confirm("Eliminare definitivamente questo evento?")) return;
  try {
    const r = await fetch(`${API_BASE}/api/events/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      alert(e.error || "Errore eliminazione (verifica di essere il creatore dell’evento)");
      return;
    }
    await loadEvents();
  } catch (err) {
    console.error("onDelete error:", err);
    alert("Errore di rete");
  }
}

/* ===================== Edit modal ===================== */
async function openEditModal(id) {
  try {
    const r = await fetch(`${API_BASE}/api/events/${id}`);
    if (!r.ok) throw new Error("not found");
    const ev = await r.json();

    editingEventId = id;
    setVal("edit-title-input", ev.title || "");
    setVal("edit-desc-input", ev.description || "");
    setVal("edit-date-input", ev.date || "");
    setVal("edit-loc-input", ev.location || "");

    byId("edit-backdrop").style.display = "flex";
  } catch (err) {
    console.error("openEditModal error:", err);
    alert("Errore nel caricamento dell'evento");
  }
}

function closeEditModal() {
  editingEventId = null;
  byId("edit-backdrop").style.display = "none";
  setVal("edit-title-input", "");
  setVal("edit-desc-input", "");
  setVal("edit-date-input", "");
  setVal("edit-loc-input", "");
}

async function onSaveEdit() {
  if (!editingEventId) return;

  const title = val("edit-title-input").trim();
  const description = val("edit-desc-input").trim();
  const date = val("edit-date-input").trim();
  const location = val("edit-loc-input").trim();

  if (!title) { alert("Titolo obbligatorio"); return; }

  try {
    const r = await fetch(`${API_BASE}/api/events/${editingEventId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ title, description, date, location })
    });

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      alert(e.error || "Errore salvataggio");
      return;
    }

    closeEditModal();
    await loadEvents();
  } catch (err) {
    console.error("onSaveEdit error:", err);
    alert("Errore di rete");
  }
}

/* ===================== Role switch & logout ===================== */
function onSwitchRole() {
  try {
    localStorage.setItem("switchingRole", "1");
    localStorage.setItem("role", "participant");
    location.href = "/partecipante.html";
  } finally {
    setTimeout(() => localStorage.removeItem("switchingRole"), 1000);
  }
}

function onLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  localStorage.removeItem("desiredRole");
  localStorage.removeItem("userRole");
  location.href = "/";
}

/* ===================== Utils ===================== */
function byId(id){ return document.getElementById(id); }
function val(id){ const el = byId(id); return el ? String(el.value || "") : ""; }
function setVal(id, v){ const el = byId(id); if (el) el.value = v; }
function safe(v, d="—"){ return (v===undefined||v===null||v==="") ? d : String(v); }
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }






