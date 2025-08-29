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

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
  }

  // Benvenuto: eseguito una sola volta e con guardia anti-duplicazione
  (async () => {
    try {
      const me = await apiGet("/users/me", token);
      const name = me?.user?.name || me?.user?.email || "utente";
      if (!document.getElementById("welcomeMsg")) {
        const main = document.querySelector("main") || document.body;
        const p = document.createElement("p");
        p.id = "welcomeMsg";
        p.className = "welcome";
        p.textContent = `Benvenuto, ${name}! Sei nella tua area Organizzatore.`;
        if (main.firstChild) main.insertBefore(p, main.firstChild); else main.appendChild(p);
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

  async function loadEvents(filters = {}) {
    listContainer.innerHTML = "<p>Caricamento...</p>";
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await apiGet(`/events/mine/list${query ? "?" + query : ""}`, token);
      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      if (!res.events.length) {
        listContainer.innerHTML = "<p>Nessun evento creato.</p>";
        return;
      }

      listContainer.innerHTML = res.events.map(ev => `
        <div class="event-card">
          <h3>${ev.title}</h3>
          <p>${ev.city || ""} ${ev.date ? new Date(ev.date).toLocaleDateString() : ""}</p>
          <div class="event-actions">
            <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
            <button class="btn btn-secondary" data-id="${ev._id}" data-action="delete">Elimina</button>
          </div>
        </div>
      `).join("");
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
        await loadEvents();
      }
    });
  }

  // Filtri
  if (btnFilters) {
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
  }

  // Switch ruolo
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

  // --- Dashboard KPI (organizzatore) --- [AGGIUNTA: funzione e chiamata, nessuna riga rimossa]
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
      const res = await apiGet("/events/mine/list", token);
      if (!res?.ok || !Array.isArray(res.events)) return;

      const events = res.events;
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

  // Prima lista
  loadEvents();

  // KPI (aggiunta)
  renderKpiFromMyEvents();
});





