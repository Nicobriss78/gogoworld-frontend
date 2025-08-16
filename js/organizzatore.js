// js/organizzatore.js
// === GoGo.World — Area Organizzatore (FILE COMPLETO) ===
// Dipendenze: token/userId salvati da login.js; BE: /api/events, /api/events/:id protetti organizer

const API_BASE = "https://gogoworld-api.onrender.com";
const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

// --- GUARD iniziale ---
// Evita redirect mentre sto cambiando ruolo.
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

// --- helpers DOM resilienti (supporto a più id possibili) ---
const pick = (ids) => ids.map(id => document.getElementById(id)).find(el => !!el) || null;

function getFields() {
  // prova più nomi per compatibilità col markup esistente
  const titleEl = pick(["event-title","title","titolo"]);
  const descEl = pick(["event-description","description","descrizione"]);
  const dateEl = pick(["event-date","date","data"]);
  const locEl = pick(["event-location","location","luogo"]);
  const addBtn = pick(["crea-btn","aggiungi-btn","add-btn"]);
  const cancelEditBtn = pick(["annulla-edit-btn","cancel-edit-btn"]);

  return { titleEl, descEl, dateEl, locEl, addBtn, cancelEditBtn };
}

let editingId = null; // quando valorizzato siamo in modalità "modifica"

async function initOrganizzatore() {
  const listEl = document.getElementById("event-list");
  const logoutBtn = document.getElementById("logout-btn");
  const switchBtn = document.getElementById("cambia-ruolo-btn");
  const { titleEl, descEl, dateEl, locEl, addBtn, cancelEditBtn } = getFields();

  if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
  if (switchBtn) switchBtn.addEventListener("click", onSwitchRoleToParticipant);

  // CREA / SALVA MODIFICHE
  if (addBtn) addBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await onCreateOrUpdate({ titleEl, descEl, dateEl, locEl, addBtn });
  });

  // ANNULLA MODIFICA (opzionale)
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", (e) => {
    e.preventDefault();
    clearForm({ titleEl, descEl, dateEl, locEl, addBtn });
  });

  await reloadList(listEl);

  // delega click per Modifica/Elimina
  document.body.addEventListener("click", async (e) => {
    const el = e.target;
    if (el.matches("[data-del]")) {
      await onDelete(el.getAttribute("data-del"));
      await reloadList(listEl);
      // se stavo modificando quell'evento, resetto il form
      if (editingId && editingId === el.getAttribute("data-del")) {
        clearForm({ titleEl, descEl, dateEl, locEl, addBtn });
      }
    } else if (el.matches("[data-edit]")) {
      const id = el.getAttribute("data-edit");
      await startEdit(id, { titleEl, descEl, dateEl, locEl, addBtn });
    }
  });
}

function doLogout(){
  localStorage.removeItem("userId");
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("currentRole");
  sessionStorage.removeItem("organizzatoreLoggato");
  sessionStorage.removeItem("partecipanteLoggato");
  location.href = "/";
}

/* ======== SWITCH ROLE → participant ======== */
async function onSwitchRoleToParticipant() {
  const userId = getUserId();
  const token = getToken();
  if (!userId || !token) { alert("Sessione scaduta. Effettua di nuovo il login."); location.href="/login.html"; return; }

  try {
    localStorage.setItem("switchingRole", "1");
    const r = await fetch(`${API_BASE}/api/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: "participant" })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `Errore cambio ruolo (${r.status})`);

    if (data.token) localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("currentRole", data.role);

    sessionStorage.removeItem("organizzatoreLoggato");
    sessionStorage.setItem("partecipanteLoggato", "true");

    location.href = "/partecipante.html";
  } catch (err) {
    alert(err.message || "Errore cambio ruolo");
  } finally {
    localStorage.removeItem("switchingRole");
  }
}

/* ======== CREATE / UPDATE ======== */
async function onCreateOrUpdate({ titleEl, descEl, dateEl, locEl, addBtn }) {
  const title = (titleEl?.value || "").trim();
  const description = (descEl?.value || "").trim();
  const dateRaw = (dateEl?.value || "").trim();
  const location = (locEl?.value || "").trim();

  if (!title || !dateRaw || !location) {
    alert("Compila almeno Titolo, Data e Luogo.");
    return;
  }

  const isoDate = normalizeDate(dateRaw); // converte "YYYY-MM-DDTHH:mm" in ISO se serve

  try {
    let res, data;
    if (editingId) {
      // PUT (modifica)
      res = await fetch(`${API_BASE}/api/events/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify({ title, date: isoDate, location, description })
      });
      data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Errore modifica (${res.status})`);
      alert("Modificato!");
    } else {
      // POST (crea)
      res = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify({ title, date: isoDate, location, description })
      });
      data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Errore creazione (${res.status})`);
      alert("Creato!");
    }

    await reloadList(document.getElementById("event-list"));
    clearForm({ titleEl, descEl, dateEl, locEl, addBtn });

  } catch (err) {
    alert(err.message || "Errore salvataggio evento");
  }
}

function normalizeDate(v) {
  // Se v è tipo "2025-12-01T18:00" → converto in ISO completo
  // Se è già ISO completo → la ritorno così com'è
  try {
    // se manca la 'Z' o i secondi, provo a costruire ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
      return new Date(v).toISOString();
    }
    // altrimenti provo a fare il parse; se valido lo trasformo comunque in ISO
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return v; // fallback: mando quello che c'è
  } catch { return v; }
}

function clearForm({ titleEl, descEl, dateEl, locEl, addBtn }) {
  editingId = null;
  if (titleEl) titleEl.value = "";
  if (descEl) descEl.value = "";
  if (dateEl) dateEl.value = "";
  if (locEl) locEl.value = "";
  if (addBtn) addBtn.textContent = "Aggiungi evento";
}

async function startEdit(id, { titleEl, descEl, dateEl, locEl, addBtn }) {
  try {
    // recupero l'evento dalla lista corrente (già in pagina) per popolare il form
    const item = document.querySelector(`[data-item="${id}"]`);
    if (!item) {
      // fallback: refetch singolo se avessimo endpoint GET /api/events/:id (non è strettamente necessario)
      alert("Impossibile preparare la modifica. Ricarica la pagina.");
      return;
    }

    // Ho salvato i dati nell'attributo data-json (vedi render)
    const json = item.getAttribute("data-json");
    const ev = json ? JSON.parse(json) : null;
    if (!ev) { alert("Dati evento non disponibili"); return; }

    editingId = id;
    if (titleEl) titleEl.value = ev.title || "";
    if (descEl) descEl.value = ev.description || "";
    if (dateEl) dateEl.value = toInputDateValue(ev.date);
    if (locEl) locEl.value = ev.location || "";
    if (addBtn) addBtn.textContent = "Salva modifiche";

    // scroll al form per UX
    try { document.querySelector("#crea-evento, #create-form, form")?.scrollIntoView({ behavior:"smooth" }); } catch {}
  } catch (err) {
    alert(err.message || "Errore attivazione modifica");
  }
}

function toInputDateValue(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    // per input datetime-local (YYYY-MM-DDTHH:mm)
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    const hh = String(d.getHours()).padStart(2,"0");
    const mi = String(d.getMinutes()).padStart(2,"0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch { return ""; }
}

/* ======== LISTA ======== */
async function reloadList(container){
  if (!container) return;
  container.innerHTML = "<em>Carico eventi...</em>";
  try {
    const res = await fetch(`${API_BASE}/api/events`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = "<p>Nessun evento.</p>";
      return;
    }
    const ul = document.createElement("ul");
    data.forEach(ev => {
      const li = document.createElement("li");
      li.setAttribute("data-item", ev._id);
      // salvo il JSON stringato per popolare il form in startEdit()
      li.setAttribute("data-json", JSON.stringify(ev));
      li.innerHTML = `
        <strong>${safe(ev.title)}</strong> – ${fmtDate(ev.date)} <em>${safe(ev.location)}</em>
        <button data-edit="${ev._id}" style="margin-left:8px;">Modifica</button>
        <button data-del="${ev._id}" style="margin-left:8px;">Elimina</button>
      `;
      ul.appendChild(li);
    });
    container.innerHTML = "";
    container.appendChild(ul);
  } catch (err) {
    container.innerHTML = `<span style="color:red;">Errore caricamento eventi</span>`;
  }
}

/* ======== Utils ======== */
function safe(v, d="—"){ return (v===undefined||v===null||v==="") ? d : String(v); }
function fmtDate(v){
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return safe(v);
    return d.toLocaleString("it-IT", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  } catch { return safe(v); }
}





