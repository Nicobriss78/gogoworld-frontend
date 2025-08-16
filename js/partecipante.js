// js/partecipante.js — area Partecipante
const API_BASE = 'https://gogoworld-api.onrender.com';

const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

document.addEventListener("DOMContentLoaded", () => { 
  initPartecipante().catch(err => console.error("[Partecipante] init error:", err));
});

async function initPartecipante() {
  localStorage.removeItem("switchingRole");
  const allEl = document.getElementById("eventi-disponibili");
  const myEl = document.getElementById("miei-eventi");

  const logoutBtn = document.getElementById("logout-btn");
  const switchBtn = document.getElementById("cambia-ruolo-btn");
  
  if (logoutBtn) logoutBtn.addEventListener("click", () => { 
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("currentRole");
    sessionStorage.removeItem("organizzatoreLoggato");
    sessionStorage.removeItem("partecipanteLoggato");
    location.href = "/";
  });

  if (switchBtn) switchBtn.addEventListener("click", onSwitchRole);

  await loadAllEvents(allEl);
  await loadMyEvents(myEl);

  // delega click per Partecipa/Annulla
  document.body.addEventListener("click", async (e) => {
    const el = e.target;
    if (el.matches("[data-partecipa]")) {
      await joinEvent(el.getAttribute("data-partecipa"));
    } else if (el.matches("[data-annulla]")) {
      await cancelEvent(el.getAttribute("data-annulla"));
    }
  });
}

async function onSwitchRole() {
  const userId = getUserId();
  const current = localStorage.getItem("role") || localStorage.getItem("currentRole") || "participant";
  const next = "organizer";

  if (!userId || !getToken()) {
    alert("Sessione scaduta. Effettua di nuovo il login.");
    location.href = "/login.html"; return;
  }

  try {
    localStorage.setItem("switchingRole", "1");
    const r = await fetch(`${API_BASE}/api/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ role: next })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `Errore cambio ruolo (${r.status})`);

    if (data.token) localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("currentRole", data.role);

    location.href = (data.role === "organizer") ? "/organizzatore.html" : "/partecipante.html";
  } catch (err) {
    alert(err.message || "Errore cambio ruolo");
  } finally {
    localStorage.removeItem("switchingRole");
  }
}

/* ======== Eventi ======== */
async function loadAllEvents(container) {
  if (!container) return;
  container.innerHTML = "<em>Carico eventi...</em>";
  try {
    const res = await fetch(`${API_BASE}/api/events`);
    const events = await res.json();
    renderAllEvents(container, events || []);
  } catch (err) {
    container.innerHTML = `<span style="color:red;">Errore caricamento eventi</span>`;
  }
}

async function loadMyEvents(container) {
  if (!container) return;
  container.innerHTML = "<em>Carico i tuoi eventi...</em>";
  try {
    const res = await fetch(`${API_BASE}/api/events`);
    const events = await res.json();
    renderMyEvents(container, events || []);
  } catch (err) {
    container.innerHTML = `<span style="color:red;">Errore caricamento eventi</span>`;
  }
}

async function joinEvent(eventId) {
  if (!getToken()) { alert("Devi effettuare il login"); location.href="/login.html"; return; }
  const uid = getUserId();
  const res = await fetch(`${API_BASE}/api/users/${uid}/partecipa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ eventId })
  });
  const data = await res.json();
  if (!res.ok) { alert(data.error || "Errore partecipazione"); return; }
  // refresh
  await loadAllEvents(document.getElementById("eventi-disponibili"));
  await loadMyEvents(document.getElementById("miei-eventi"));
}

async function cancelEvent(eventId) {
  if (!getToken()) { alert("Devi effettuare il login"); location.href="/login.html"; return; }
  const uid = getUserId();
  const res = await fetch(`${API_BASE}/api/users/${uid}/annulla`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ eventId })
  });
  const data = await res.json();
  if (!res.ok) { alert(data.error || "Errore annullamento"); return; }
  // refresh
  await loadAllEvents(document.getElementById("eventi-disponibili"));
  await loadMyEvents(document.getElementById("miei-eventi"));
}

/* ======== Rendering ======== */
function renderAllEvents(container, events) {
  container.innerHTML = "";
  if (!Array.isArray(events) || events.length === 0) {
    container.innerHTML = "<p>Nessun evento disponibile.</p>";
    return;
  }
  const ul = document.createElement("ul");
  events.forEach(ev => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${safe(ev.title)}</strong> – ${fmtDate(ev.date)} <em>${safe(ev.location)}</em>
      <button data-partecipa="${ev._id}" style="margin-left:8px;">Partecipa</button>
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

function renderMyEvents(container, events) {
  container.innerHTML = "";
  const myEvents = (events || []).filter(e => Array.isArray(e.participants) && e.participants.includes(String(getUserId())));
  if (myEvents.length === 0){
    container.innerHTML = "<p>Non partecipi ad alcun evento.</p>";
    return;
  }
  const ul = document.createElement("ul");
  myEvents.forEach(ev => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${safe(ev.title)}</strong> – ${fmtDate(ev.date)} <em>${safe(ev.location)}</em>
      <button data-annulla="${ev._id}" style="margin-left:8px;">Annulla</button>
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

function safe(v, d="—"){ return (v===undefined||v===null||v==="") ? d : String(v); }
function fmtDate(v){
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return safe(v);
    return d.toLocaleString("it-IT", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  } catch { return safe(v); }
}


