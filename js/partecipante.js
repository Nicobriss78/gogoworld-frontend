// js/partecipante.js — area Partecipante
//
// TODO UI/UX Overhaul:
// - Card evento con layout consistente (immagine, meta, azioni)
// - Stati dei bottoni (join/leave) uniformi e con feedback visivo
// - Filtri con componenti input standard (date, select, tag)
// - Notifiche errori/successo tramite componente centralizzato

import { apiGet, apiPost } from "./api.js";

// Banner messaggi (error/success) con auto-hide opzionale
function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
  }
  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}

// Helper: format event date using available fields (date | dateStart [– endDate/dateEnd])
function formatEventDate(ev) {
  try {
    const start = ev?.date || ev?.dateStart;
    const end = ev?.endDate || ev?.dateEnd;
    if (!start && !end) return "";
    const startStr = start ? new Date(start).toLocaleDateString() : "";
    if (end) {
      const endStr = new Date(end).toLocaleDateString();
      if (startStr && endStr && startStr !== endStr) {
        return `${startStr} – ${endStr}`;
      }
    }
    return startStr;
  } catch { return ""; }
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const allList = document.getElementById("allEventsList");
  const myList = document.getElementById("myEventsList");
  const btnFilters = document.getElementById("btnApplyFilters");
  const btnLogout = document.getElementById("btnLogout");
  const btnSwitchRole = document.getElementById("btnSwitchRole");

  // 👉 Benvenuto: creato UNA sola volta qui (non dentro loadEvents)
  try {
    const me = await apiGet("/users/me", token);
    // FIX CHIRURGICO: supporta sia payload “piatto” {name,email} sia {user:{name,email}}
    const name =
      me?.name ||
      me?.user?.name ||
      me?.email ||
      me?.user?.email ||
      "utente";

    if (!document.getElementById("welcomeMsg")) {
      const main = document.querySelector("main") || document.body;
      const p = document.createElement("p");
      p.id = "welcomeMsg";
      p.className = "welcome";
      p.textContent = `Benvenuto, ${name}! Sei nella tua area Partecipante.`;
      if (main.firstChild) main.insertBefore(p, main.firstChild); else main.appendChild(p);
    } else {
      // se esiste già, aggiorna il testo per coerenza
      document.getElementById("welcomeMsg").textContent =
        `Benvenuto, ${name}! Sei nella tua area Partecipante.`;
    }
  } catch {
    // nessun blocco della UI se /users/me fallisce: lo gestirà loadEvents()
  }

  async function loadEvents(filters = {}) {
    allList.innerHTML = "<p>Caricamento...</p>";
    myList.innerHTML = "";

    try {
      const query = new URLSearchParams(filters).toString();
      const res = await apiGet(`/events${query ? "?" + query : ""}`, token);
      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      // Recupera anche i miei per marcare join/leave
      const me = await apiGet("/users/me", token);
      const myId = me?.user?._id || me?._id;
      const joinedIds = new Set();
      if (Array.isArray(res?.events)) {
        for (const ev of res.events) {
          if (Array.isArray(ev?.participants) && myId) {
            if (ev.participants.some(p => (p?._id || p) === myId)) {
              joinedIds.add(ev._id);
            }
          }
        }
      }

      // Popola lista "tutti"
      allList.innerHTML = res.events.length
        ? res.events.map(ev => `
        <div class="event-card">
          <h3>${ev.title}</h3>
          <p>${ev.city || ""} ${formatEventDate(ev)}</p>
          <div class="event-actions">
            <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
            ${joinedIds.has(ev._id)
              ? `<button class="btn btn-secondary" data-id="${ev._id}" data-action="leave">Annulla</button>`
              : `<button class="btn btn-primary" data-id="${ev._id}" data-action="join">Partecipa</button>`}
          </div>
        </div>
      `).join("")
        : "<p>Nessun evento disponibile.</p>";

      // Popola lista "a cui partecipo"
      const joined = res.events.filter(ev => joinedIds.has(ev._id));
      myList.innerHTML = joined.length
        ? joined.map(ev => `
          <div class="event-card">
            <h3>${ev.title}</h3>
            <p>${ev.city || ""} ${formatEventDate(ev)}</p>
            <div class="event-actions">
              <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
              <button class="btn btn-secondary" data-id="${ev._id}" data-action="leave">Annulla</button>
            </div>
          </div>
        `).join("")
        : "<p>Nessun evento a cui partecipi.</p>";

    } catch (err) {
      showAlert(err?.message || "Si è verificato un errore", "error", { autoHideMs: 4000 });
      allList.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
      myList.innerHTML = "";
    }
  }

  // Delegation click (tutti / miei)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");

    if (action === "details") {
      sessionStorage.setItem("selectedEventId", id);
      window.location.href = "evento.html";
      return;
    }

    if (action === "join") {
      const res = await apiPost(`/events/${id}/join`, {}, token);
      if (!res.ok) {
        showAlert(res.error || "Errore iscrizione", "error", { autoHideMs: 4000 });
        return;
      }
      showAlert("Iscrizione effettuata", "success", { autoHideMs: 2500 });
      await loadEvents();
      return;
    }

    if (action === "leave") {
      const res = await apiPost(`/events/${id}/leave`, {}, token);
      if (!res.ok) {
        showAlert(res.error || "Errore annullamento", "error", { autoHideMs: 4000 });
        return;
      }
      showAlert("Partecipazione annullata", "success", { autoHideMs: 2500 });
      await loadEvents();
      return;
    }
  });

  // Filtri
  const hookFilters = () => {
    if (!btnFilters) return;
    btnFilters.addEventListener("click", async () => {
      const filters = {};
      const title = document.getElementById("filterTitle")?.value?.trim();
      const city = document.getElementById("filterCity")?.value?.trim();
      const region = document.getElementById("filterRegion")?.value?.trim();
      const dateStart = document.getElementById("filterDateStart")?.value?.trim();
      const dateEnd = document.getElementById("filterDateEnd")?.value?.trim();
      if (title) filters.title = title;
      if (city) filters.city = city;
      if (region) filters.region = region;
      if (dateStart) filters.dateStart = dateStart;
      if (dateEnd) filters.dateEnd = dateEnd;
      await loadEvents(filters);
    });
  };

  // Switch ruolo
  if (btnSwitchRole) {
    btnSwitchRole.addEventListener("click", () => {
      sessionStorage.setItem("desiredRole", "organizer");
      window.location.href = "organizzatore.html";
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("desiredRole");
      window.location.href = "../index.html";
    });
  }

  // Inizializza
  hookFilters();

  // Prima lista
  loadEvents();
});
