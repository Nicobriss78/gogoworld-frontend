// ---- GUARD compat: non mandare al login mentre sto cambiando ruolo ----
(function guardOrganizzatore(){
  const switching = localStorage.getItem("switchingRole") === "1";
  if (switching) {
    // Sto cambiando ruolo: non fare redirect qui.
    return;
  }

  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role") || localStorage.getItem("currentRole");
  const orgFlag = sessionStorage.getItem("organizzatoreLoggato") === "true";

  if (!userId) { location.href = "/login.html"; return; }

  // Se davvero non sono organizzatore, non mandarmi al login: porta direttamente a Partecipante
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

  if (logoutBtn) logoutBtn.addEventListener("click", () => { localStorage.removeItem("userId"); location.href = "/"; });
  if (creaBtn) creaBtn.addEventListener("click", createEvent);

  await refreshList(listEl);
}

async function refreshList(container) {
  const events = await fetchJSON("/api/events");
  renderEvents(container, events);
}

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

  const r = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

async function deleteEvent(id) {
  const r = await fetch(`/api/events/${id}`, { method: "DELETE" });
  if (!r.ok) {
    alert("Errore eliminazione evento");
    return;
  }
  await refreshList(document.getElementById("event-list"));
}

async function fetchJSON(url) {
  const r = await fetch(url);
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
  const ul = document.createElement("ul");
  events.forEach(ev => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${safe(ev.title)}</strong> – ${fmtDate(ev.date)} <em>${safe(ev.location)}</em>
      <button data-del="${ev.id}" style="margin-left:8px;">🗑️</button>
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);

  // bind delete
  container.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deleteEvent(btn.getAttribute("data-del")));
  });
}

function safe(v, d="—"){ return (v===undefined||v===null||v==="") ? d : String(v); }
function fmtDate(v){
  try { const d = new Date(v); if (Number.isNaN(d.getTime())) return safe(v);
    return d.toLocaleString("it-IT",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
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
      localStorage.setItem("swtchingRole", "1")
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