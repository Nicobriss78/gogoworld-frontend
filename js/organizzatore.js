// js/organizzatore.js — area Organizzatore
//
// TODO UI/UX Overhaul:
// - Lista "I miei eventi" con card/table responsive e azioni visibili
// - Conferme modali standard per delete (invece di confirm())
// - Banner “welcome” con micro-CTA (es. “Crea nuovo evento”)

import { apiGet, apiDelete } from "./api.js";

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

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
  }

  // Benvenuto: eseguito una sola volta e con guardia anti-duplicazione
  (async () => {
    try {
      const me = await apiGet("/users/me", token);
      // FIX CHIRURGICO: supporta payload piatto {name,email} e annidato {user:{...}}
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
        p.textContent = `Benvenuto, ${name}! Sei nella tua area Organizzatore.`;
        if (main.firstChild) main.insertBefore(p, main.firstChild); else main.appendChild(p);
      } else {
        document.getElementById("welcomeMsg").textContent =
          `Benvenuto, ${name}! Sei nella tua area Organizzatore.`;
      }
    } catch {
      /* silente */
    }
  })();

  const listContainer = document.getElementById("myEventsList");
  const btnFilters = document.getElementById("btnApplyFilters");
  const btnLogout = document.getElementById("btnLogout");
  const btnSwitchRole = document.getElementById("btnSwitchRole");
  const btnCreate = document.getElementById("btnCreateEvent");

  // 👉 AGGIUNTA CHIRURGICA: handler per Importa CSV (Opzione A)
  const btnImportCsv = document.getElementById("btnImportCsv");
  if (btnImportCsv) {
    btnImportCsv.addEventListener("click", () => {
      window.location.href = "pages/import.html";
    });
  }

  async function loadEvents(filters = {}) {
    listContainer.innerHTML = "<p>Caricamento...</p>";
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await apiGet(`/events/mine/list${query ? "?" + query : ""}`, token);
      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      if (!res.events.length) {
        listContainer.innerHTML = "<p>Nessun evento creato.</p>";
      } else {
        listContainer.innerHTML = res.events.map(ev => `
          <div class="event-card">
            <h3>${ev.title}</h3>
            <p>${ev.city || ""} ${formatEventDate(ev)}</p>
            <div class="event-actions">
              <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
              <button class="btn btn-secondary" data-id="${ev._id}" data-action="delete">Elimina</button>
            </div>
          </div>
        `).join("");
      }

      // --- SINCRONIZZAZIONE DASHBOARD ---
      // Cache locale per KPI/Tabella
      window.__myEventsCache = Array.isArray(res.events) ? res.events : [];
      // Re-render KPI e Tabella con i dati correnti
      try { renderKpiFromMyEvents(); } catch {}
      try { renderParticipantsTableFromMyEvents(); } catch {}

    } catch (err) {
      listContainer.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
      showAlert(err?.message || "Errore caricamento eventi", "error", { autoHideMs: 4000 });
    }
  }

  // Event delegation
  if (listContainer) {
    listContainer.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");

      if (action === "details") {
        sessionStorage.setItem("selectedEventId", id);
        window.location.href = "evento.html";
        return;
      }

      if (action === "delete") {
        if (!confirm("Eliminare questo evento?")) return;
        const res = await apiDelete(`/events/${id}`, token);
        if (!res.ok) {
          showAlert(res.error || "Errore eliminazione", "error", { autoHideMs: 4000 });
          return;
        }
        showAlert("Evento eliminato", "success", { autoHideMs: 2500 });
        await loadEvents(); // KPI/Tabella si aggiornano dentro loadEvents
      }
    });
  }

  // Filtri
  if (btnFilters) {
    btnFilters.addEventListener("click", async () => {
      const filters = {};
      const title = document.getElementById("filterTitle")?.value?.trim();
      const city = document.getElementById("filterCity")?.value?.trim();
      const category = document.getElementById("filterCategory")?.value?.trim(); // categoria effettiva
      const region = document.getElementById("filterRegion")?.value?.trim();
      const dateStart = document.getElementById("filterDateStart")?.value?.trim();
      const dateEnd = document.getElementById("filterDateEnd")?.value?.trim();
      if (title) filters.title = title;
      if (city) filters.city = city;
      if (category) filters.category = category; // passa in query come singolo valore
      if (region) filters.region = region;
      if (dateStart) filters.dateStart = dateStart;
      if (dateEnd) filters.dateEnd = dateEnd;
      await loadEvents(filters); // KPI/Tabella si aggiornano dentro loadEvents
    });
  }

  // Switch ruolo (codice in inglese)
  if (btnSwitchRole) {
    btnSwitchRole.addEventListener("click", () => {
      sessionStorage.setItem("desiredRole", "participant");
      window.location.href = "partecipante.html";
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

  // Create (placeholder)
  if (btnCreate) {
    btnCreate.addEventListener("click", () => {
      alert("Funzione Crea evento: in arrivo.");
    });
  }

  // --- Dashboard KPI (organizzatore) ---
  async function renderKpiFromMyEvents() {
    // Usa un container esistente o creane uno prima della lista
    let container = document.getElementById("dashboardKPI");
    if (!container) {
      const myEventsList = document.getElementById("myEventsList");
      const section = document.createElement("section");
      section.id = "dashboardKPI";
      section.className = "kpi-grid";
      if (myEventsList && myEventsList.parentNode) {
        myEventsList.parentNode.insertBefore(section, myEventsList);
      } else {
        const main = document.querySelector("main") || document.body;
        main.insertBefore(section, main.firstChild);
      }
      container = section;
    }

    // Placeholder per evitare layout shift
    container.innerHTML = `
      <div class="kpi-card"><div class="kpi-label">Totale Eventi</div><div class="kpi-value">—</div></div>
      <div class="kpi-card"><div class="kpi-label">Partecipanti Totali</div><div class="kpi-value">—</div></div>
      <div class="kpi-card"><div class="kpi-label">Media Partecipanti</div><div class="kpi-value">—</div></div>
      <div class="kpi-card"><div class="kpi-label">Top Evento</div><div class="kpi-value">—</div></div>
    `;

    try {
      // Usa cache se presente per evitare una seconda fetch
      let events = Array.isArray(window.__myEventsCache) ? window.__myEventsCache : null;

      if (!events) {
        const res = await apiGet("/events/mine/list", token);
        if (!res?.ok || !Array.isArray(res.events)) return;
        events = res.events;
        window.__myEventsCache = events; // popola cache
      }

      const totalEvents = events.length;

      let totalParticipants = 0;
      let top = null;
      for (const ev of events) {
        const count = Array.isArray(ev?.participants) ? ev.participants.length : 0;
        totalParticipants += count;
        if (!top || count > (Array.isArray(top.participants) ? top.participants.length : 0)) {
          top = ev;
        }
      }

      const avgParticipants = totalEvents > 0 ? Math.round((totalParticipants / totalEvents) * 10) / 10 : 0;
      const topLabel = top ? (top.title || top.name || top._id || "—") : "—";
      const topCount = top ? (Array.isArray(top.participants) ? top.participants.length : 0) : "—";

      container.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Totale Eventi</div>
          <div class="kpi-value">${totalEvents}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Partecipanti Totali</div>
          <div class="kpi-value">${totalParticipants}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Media Partecipanti</div>
          <div class="kpi-value">${avgParticipants}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Top Evento</div>
          <div class="kpi-value">${topLabel} <span class="kpi-sub">(${topCount})</span></div>
        </div>
      `;
    } catch {
      // silente: i KPI non devono bloccare la pagina
    }
  }

  // --- Tabellina "Partecipanti per evento" (non invasiva) ---
  async function renderParticipantsTableFromMyEvents() {
    // Crea o recupera il container subito sotto i KPI e sopra la lista
    let container = document.getElementById("participantsByEvent");
    if (!container) {
      const kpi = document.getElementById("dashboardKPI");
      const myEventsList = document.getElementById("myEventsList");
      const section = document.createElement("section");
      section.id = "participantsByEvent";
      // Posiziona la tabella: dopo i KPI, prima della lista
      if (kpi && kpi.parentNode) {
        kpi.parentNode.insertBefore(section, myEventsList || kpi.nextSibling);
      } else if (myEventsList && myEventsList.parentNode) {
        myEventsList.parentNode.insertBefore(section, myEventsList);
      } else {
        const main = document.querySelector("main") || document.body;
        main.appendChild(section);
      }
      container = section;
    }

    // Stato iniziale
    container.innerHTML = `<div class="table-wrap"><table class="simple-table">
      <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
      <tbody><tr><td colspan="2">Caricamento…</td></tr></tbody>
    </table></div>`;

    try {
      // Usa la cache se presente, altrimenti recupera
      let events = Array.isArray(window.__myEventsCache) ? window.__myEventsCache : null;
      if (!events) {
        const res = await apiGet("/events/mine/list", token);
        if (!res?.ok || !Array.isArray(res.events)) {
          container.innerHTML = `<div class="table-wrap"><table class="simple-table">
            <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
            <tbody><tr><td colspan="2">Nessun dato disponibile</td></tr></tbody>
          </table></div>`;
          return;
        }
        events = res.events;
      }

      if (!events.length) {
        container.innerHTML = `<div class="table-wrap"><table class="simple-table">
          <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
          <tbody><tr><td colspan="2">Nessun evento creato</td></tr></tbody>
        </table></div>`;
        return;
      }

      // Costruzione righe ordinate per n. partecipanti (desc)
      const rows = events
        .map(ev => ({
          id: ev._id,
          label: ev.title || ev.name || ev._id || "—",
          count: Array.isArray(ev?.participants) ? ev.participants.length : 0
        }))
        .sort((a, b) => b.count - a.count)
        .map(r => `<tr><td>${r.label}</td><td>${r.count}</td></tr>`)
        .join("");

      container.innerHTML = `<div class="table-wrap"><table class="simple-table">
        <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
    } catch {
      container.innerHTML = `<div class="table-wrap"><table class="simple-table">
        <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
        <tbody><tr><td colspan="2">Errore di caricamento</td></tr></tbody>
      </table></div>`;
    }
  }

  // Prima lista
  loadEvents();

  // KPI (aggiunta)
  renderKpiFromMyEvents();

  // Tabellina partecipanti per evento (aggiunta)
  renderParticipantsTableFromMyEvents();
});
