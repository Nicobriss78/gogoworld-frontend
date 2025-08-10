// partecipante.js — patch 2025-08-09 (con Partecipa/Annulla)
document.addEventListener("DOMContentLoaded", () => { initPartecipante().catch(console.error); });

async function initPartecipante() {
  localStorage.removeItem("switchingRole");
  const allEl = document.getElementById("eventi-disponibili");
  const myEl = document.getElementById("miei-eventi");

  const logoutBtn = document.getElementById("logout-btn");
  const switchBtn = document.getElementById("cambia-ruolo-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => { localStorage.removeItem("userId"); location.href = "/"; });
  if (switchBtn) switchBtn.addEventListener("click", () => { location.href = "/"; });

  await refreshLists(allEl, myEl);
}

async function refreshLists(allEl, myEl) {
  const events = await fetchJSON("/api/events");

  const userId = localStorage.getItem("userId");
  let myIds = [];
  if (userId) {
    try {
      const user = await fetchJSON(`/api/users/${userId}`);
      const raw = user.eventsPartecipati || user.eventiPartecipati || user.partecipazioni || [];
      myIds = raw.map(n => Number(n)).filter(n => !Number.isNaN(n));
    } catch (e) { console.warn("Dati utente non disponibili:", e); }
  }

  renderAll(allEl, events, myIds);
  const mine = events.filter(ev => myIds.includes(Number(ev.id)));
  renderMine(myEl, mine);
}

function renderAll(container, list, myIds) {
  if (!container) return;
  container.innerHTML = `<h3>Tutti gli Eventi</h3>`;
  if (!list || list.length === 0) {
    container.innerHTML += `<p>Nessun evento disponibile.</p>`;
    return;
  }
  const ul = document.createElement("ul");
  list.forEach(ev => {
    const li = document.createElement("li");
    const joined = myIds.includes(Number(ev.id));
    li.innerHTML = `
      <strong>${safe(ev.title)}</strong> – ${fmtDate(ev.date)}
      <div>${safe(ev.description)}</div>
      <div><em>${safe(ev.location)}</em></div>
      <div style="margin:.4rem 0;">
        ${joined
          ? `<button data-act="leave" data-id="${ev.id}">Annulla partecipazione</button>`
          : `<button data-act="join" data-id="${ev.id}">Partecipa</button>`}
      </div>
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);

  // delega click
  ul.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const userId = localStorage.getItem("userId");
    if (!userId) { alert("Devi fare login."); location.href = "/login.html"; return; }

    const eventId = Number(btn.getAttribute("data-id"));
    try {
      if (btn.dataset.act === "join") {
        await postJSON(`/api/users/${userId}/partecipa`, { eventId });
      } else {
        await postJSON(`/api/users/${userId}/annulla`, { eventId });
      }
      await refreshLists(
        document.getElementById("eventi-disponibili"),
        document.getElementById("miei-eventi")
      );
    } catch (err) {
      alert(err.message || "Errore");
    }
  });
}

function renderMine(container, list) {
  if (!container) return;
  container.innerHTML = `<h3>I Miei Eventi</h3>`;
  if (!list || list.length === 0) {
    container.innerHTML += `<p>Nessun evento disponibile.</p>`;
    return;
  }
  const ul = document.createElement("ul");
  list.forEach(ev => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${safe(ev.title)}</strong> – ${fmtDate(ev.date)} <em>${safe(ev.location)}</em>
      <div>${safe(ev.description)}</div>
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} su ${url}`);
  return r.json();
}
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  if (!r.ok) {
    const m = await r.json().catch(()=> ({}));
    throw new Error(m.error || `HTTP ${r.status} su ${url}`);
  }
  return r.json().catch(()=> ({}));
}

function safe(v, d = "—") { return (v === undefined || v === null || v === "") ? d : String(v); }
function fmtDate(v) {
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return safe(v);
    return d.toLocaleString("it-IT", {
      weekday:"long", year:"numeric", month:"long", day:"numeric",
      hour:"2-digit", minute:"2-digit"
    });
  } catch { return safe(v); }
}

// === Role Switcher robusto e compat legacy IT/EN ===
(function setupRoleSwitcher(){
  const btn =
    document.getElementById("cambia-ruolo-btn") ||
    document.querySelector('[data-action="switch-role"]');

  if (!btn) return;

  // neutralizza onclick/vecchi listener
  try { btn.setAttribute("onclick", ""); } catch {}
  btn.type = "button";
  const clone = btn.cloneNode(true);
  btn.parentNode.replaceChild(clone, btn);
  const switchBtn = clone;

  switchBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    const userId = localStorage.getItem("userId");
    const current =
      localStorage.getItem("role") ||
      localStorage.getItem("currentRole") ||
      "participant";
    const next = current === "organizer" ? "participant" : "organizer";

    if (!userId) { location.href = "/"; return; }

    try {
      const r = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRole: next })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Errore cambio ruolo (${r.status})`);

      // ---- Nuovo schema (EN) ----
      localStorage.setItem("role", data.currentRole);
      localStorage.setItem("currentRole", data.currentRole);

      // ---- Legacy flags (IT) usate dai guard vecchi ----
      const itRole = (data.currentRole === "organizer") ? "organizzatore" : "partecipante";
      localStorage.setItem("userRole", itRole); // molti guard leggono questo
      if (data.currentRole === "organizer") {
        sessionStorage.setItem("organizzatoreLoggato", "true");
        sessionStorage.setItem("partecipanteLoggato", "");
      } else {
        sessionStorage.setItem("partecipanteLoggato", "true");
        sessionStorage.setItem("organizzatoreLoggato", "");
      }

      // ---- Aggiorna utenteCorrente sia EN che IT ----
      try {
        const raw = sessionStorage.getItem("utenteCorrente");
        const u = raw ? JSON.parse(raw) : {};
        u.role = data.currentRole; // EN
        u.currentRole = data.currentRole; // EN
        u.ruolo = itRole; // IT (compat vecchi check)
        sessionStorage.setItem("utenteCorrente", JSON.stringify(u));
      } catch {}

      // redirect diretto
      if (data.currentRole === "organizer") {
        location.href = "/organizzatore.html";
      } else {
        location.href = "/partecipante.html";
      }
    } catch (err) {
      alert(err.message || "Errore cambio ruolo");
    }
  }, { capture: true });
})();