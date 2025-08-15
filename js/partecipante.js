// public/js/partecipante.js — pointing to Render API

// 👉 Base URL dell’API su Render (assoluto, così funziona da Netlify)
const API_BASE = 'https://gogoworld-api.onrender.com';

const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

document.addEventListener("DOMContentLoaded", () => { initPartecipante().catch(console.error); });

async function initPartecipante() {
  localStorage.removeItem("switchingRole");
  const allEl = document.getElementById("eventi-disponibili");
  const myEl = document.getElementById("miei-eventi");

  const logoutBtn = document.getElementById("logout-btn");
  const switchBtn = document.getElementById("cambia-ruolo-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => { 
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    location.href = "/";
  });
  if (switchBtn) switchBtn.addEventListener("click", () => { location.href = "/"; });

  await refreshLists(allEl, myEl);

  // delega: partecipa/annulla
  document.body.addEventListener("click", async (ev) => {
    const joinBtn = ev.target.closest("[data-partecipa]");
    const leaveBtn = ev.target.closest("[data-annulla]");
    if (joinBtn) {
      await partecipa(joinBtn.getAttribute("data-partecipa"));
    } else if (leaveBtn) {
      await annulla(leaveBtn.getAttribute("data-annulla"));
    }
  });
}

async function refreshLists(allEl, myEl) {
  const [me, events] = await Promise.all([
    fetchJSON(`${API_BASE}/api/users/${getUserId()}`),
    fetchJSON(`${API_BASE}/api/events`)
  ]);

  renderAll(allEl, events);
  renderMine(myEl, events, me);
}

// ---- Azioni partecipazione ----
async function partecipa(eventId) {
  if (!getToken()) { alert("Sessione scaduta. Effettua di nuovo il login."); location.href="/login.html"; return; }
  const data = await postJSON(`${API_BASE}/api/users/${getUserId()}/partecipa`, { eventId });
  alert("Iscrizione effettuata!");
  await refreshLists(
    document.getElementById("eventi-disponibili"),
    document.getElementById("miei-eventi")
  );
}

async function annulla(eventId) {
  if (!getToken()) { alert("Sessione scaduta. Effettua di nuovo il login."); location.href="/login.html"; return; }
  const data = await postJSON(`${API_BASE}/api/users/${getUserId()}/annulla`, { eventId });
  alert("Partecipazione annullata");
  await refreshLists(
    document.getElementById("eventi-disponibili"),
    document.getElementById("miei-eventi")
  );
}

// ---- Helpers fetch ----
async function fetchJSON(url) {
  const headers = {};
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const r = await fetch(url, { headers });
  if (!r.ok) {
    const t = await r.text().catch(()=> "");
    throw new Error(`HTTP ${r.status} su ${url} – ${t || "Missing token"}`);
  }
  return r.json();
}

async function postJSON(url, body) {
  const headers = { "Content-Type": "application/json" };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {})
  });
  const data = await r.json().catch(()=> ({}));
  if (!r.ok) {
    throw new Error(data.error || `HTTP ${r.status} su ${url}`);
  }
  return data;
}

// ---- Render minimal (adatta al tuo markup esistente) ----
function renderAll(container, events){
  if (!container) return;
  container.innerHTML = "";
  if (!events || events.length === 0){
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

function renderMine(container, events, me){
  if (!container) return;
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
