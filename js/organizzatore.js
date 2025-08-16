// js/organizzatore.js
const API_BASE = "https://gogoworld-api.onrender.com";
const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

// GUARD: se non organizer o non loggato, rimanda dove serve.
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

async function initOrganizzatore() {
  const listEl = document.getElementById("event-list");
  const logoutBtn = document.getElementById("logout-btn");
  const creaBtn = document.getElementById("crea-btn");
  const switchBtn = document.getElementById("cambia-ruolo-btn");

  if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
  if (creaBtn) creaBtn.addEventListener("click", onCreate);
  if (switchBtn) switchBtn.addEventListener("click", onSwitchRoleToParticipant);

  await reloadList(listEl);

  // delega click per eliminazione
  document.body.addEventListener("click", async (e) => {
    const el = e.target;
    if (el.matches("[data-del]")) {
      await onDelete(el.getAttribute("data-del"));
      await reloadList(listEl);
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

    // pulizia/flag
    sessionStorage.removeItem("organizzatoreLoggato");
    sessionStorage.setItem("partecipanteLoggato", "true");

    location.href = "/partecipante.html";
  } catch (err) {
    alert(err.message || "Errore cambio ruolo");
  } finally {
    localStorage.removeItem("switchingRole");
  }
}

/* ======== Eventi ======== */
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
      li.innerHTML = `
        <strong>${safe(ev.title)}</strong> – ${fmtDate(ev.date)} <em>${safe(ev.location)}</em>
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

async function onCreate(){
  const title = prompt("Titolo evento?");
  const date = prompt("Data (ISO es. 2025-12-01T18:00:00.000Z)","2025-12-01T18:00:00.000Z");
  const location = prompt("Luogo?","Potenza");
  if (!title || !date || !location) return;

  const res = await fetch(`${API_BASE}/api/events`, {
    method: "POST",
    headers: { "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
    body: JSON.stringify({ title, date, location })
  });
  const data = await res.json();
  if (!res.ok) { alert(data?.error || "Errore creazione"); return; }
  alert("Creato!");
  await reloadList(document.getElementById("event-list"));
}

async function onDelete(id){
  const ok = confirm("Confermi eliminazione?");
  if (!ok) return;
  const res = await fetch(`${API_BASE}/api/events/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(()=>null);
    alert(data?.error || "Errore eliminazione");
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




