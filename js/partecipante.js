// public/js/partecipante.js — versione DEBUG con log completi
const API_BASE = 'https://gogoworld-api.onrender.com';

const getToken = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

document.addEventListener("DOMContentLoaded", () => { 
  console.log("[DEBUG] DOMContentLoaded → avvio initPartecipante");
  initPartecipante().catch(err => console.error("[DEBUG] Errore initPartecipante:", err));
});

async function initPartecipante() {
  console.log("[DEBUG] initPartecipante → userId:", getUserId(), "token:", getToken());
  
  localStorage.removeItem("switchingRole");
  const allEl = document.getElementById("eventi-disponibili");
  const myEl = document.getElementById("miei-eventi");

  const logoutBtn = document.getElementById("logout-btn");
  const switchBtn = document.getElementById("cambia-ruolo-btn");
  
  if (logoutBtn) logoutBtn.addEventListener("click", () => { 
    console.log("[DEBUG] Logout cliccato");
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    location.href = "/";
  });

  if (switchBtn) switchBtn.addEventListener("click", () => { 
    console.log("[DEBUG] Cambia ruolo cliccato");
    location.href = "/"; 
  });

  await refreshLists(allEl, myEl);

  document.body.addEventListener("click", async (ev) => {
    const joinBtn = ev.target.closest("[data-partecipa]");
    const leaveBtn = ev.target.closest("[data-annulla]");
    if (joinBtn) {
      console.log("[DEBUG] Click partecipa → eventId:", joinBtn.getAttribute("data-partecipa"));
      await partecipa(joinBtn.getAttribute("data-partecipa"));
    } else if (leaveBtn) {
      console.log("[DEBUG] Click annulla → eventId:", leaveBtn.getAttribute("data-annulla"));
      await annulla(leaveBtn.getAttribute("data-annulla"));
    }
  });
}

async function refreshLists(allEl, myEl) {
  console.log("[DEBUG] refreshLists → chiamata API utente e lista eventi");
  const [me, events] = await Promise.all([
    fetchJSON(`${API_BASE}/api/users/${getUserId()}`),
    fetchJSON(`${API_BASE}/api/events`)
  ]);
  console.log("[DEBUG] refreshLists → me:", me);
  console.log("[DEBUG] refreshLists → events:", events);

  renderAll(allEl, events);
  renderMine(myEl, events, me);
}

async function partecipa(eventId) {
  if (!getToken()) { 
    console.warn("[DEBUG] Nessun token trovato in partecipa()");
    alert("Sessione scaduta. Effettua di nuovo il login."); 
    location.href="/login.html"; 
    return; 
  }
  console.log("[DEBUG] partecipa → POST", eventId);
  const data = await postJSON(`${API_BASE}/api/users/${getUserId()}/partecipa`, { eventId });
  console.log("[DEBUG] partecipa → risposta:", data);
  alert("Iscrizione effettuata!");
  await refreshLists(
    document.getElementById("eventi-disponibili"),
    document.getElementById("miei-eventi")
  );
}

async function annulla(eventId) {
  if (!getToken()) { 
    console.warn("[DEBUG] Nessun token trovato in annulla()");
    alert("Sessione scaduta. Effettua di nuovo il login."); 
    location.href="/login.html"; 
    return; 
  }
  console.log("[DEBUG] annulla → POST", eventId);
  const data = await postJSON(`${API_BASE}/api/users/${getUserId()}/annulla`, { eventId });
  console.log("[DEBUG] annulla → risposta:", data);
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
  console.log("[DEBUG] fetchJSON → URL:", url, "Headers:", headers);
  const r = await fetch(url, { headers });
  console.log("[DEBUG] fetchJSON → status:", r.status);
  if (!r.ok) {
    const t = await r.text().catch(()=> "");
    console.error("[DEBUG] fetchJSON → errore:", t);
    throw new Error(`HTTP ${r.status} su ${url} – ${t || "Missing token"}`);
  }
  const json = await r.json();
  console.log("[DEBUG] fetchJSON → risposta JSON:", json);
  return json;
}

async function postJSON(url, body) {
  const headers = { "Content-Type": "application/json" };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  console.log("[DEBUG] postJSON → URL:", url, "Headers:", headers, "Body:", body);
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {})
  });
  const data = await r.json().catch(()=> ({}));
  console.log("[DEBUG] postJSON → status:", r.status, "data:", data);
  if (!r.ok) {
    console.error("[DEBUG] postJSON → errore:", data.error);
    throw new Error(data.error || `HTTP ${r.status} su ${url}`);
  }
  return data;
}

// ---- Render minimal ----
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
