import { applyEventFilters } from "./organizer-events-filters.js?v=4";

function formatDate(value) {
  if (!value) return "Data non disponibile";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data non valida";
  }

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventId(event) {
  return event?._id || event?.id || "";
}

function renderEventCard(event) {
  const eventId = getEventId(event);
  const title = event.title || "Evento senza titolo";
  const status = event.approvalStatus || "pending";
  const visibility = event.visibility || "public";
  const city = event.city || "Città non indicata";
  const participants = Array.isArray(event.participants) ? event.participants.length : 0;
  const privacy = event.isPrivate ? "Privato" : "Pubblico";

  return `
    <article class="org-event-card" data-event-id="${eventId}">
      <h2>${title}</h2>

      <div class="org-event-meta">
        <span>Stato: ${status}</span>
        <span>Visibilità: ${visibility} · ${privacy}</span>
        <span>Luogo: ${city}</span>
        <span>Inizio: ${formatDate(event.dateStart)}</span>
        <span>Fine: ${formatDate(event.dateEnd)}</span>
        <span>Partecipanti: ${participants}</span>
      </div>

      <div class="org-event-actions">
        <a href="/pages/organizer-event-detail-v2.html?id=${eventId}">Apri</a>
        <a href="/pages/organizer-event-edit-v2.html?id=${eventId}">Modifica</a>
        <button type="button" class="danger" data-action="delete-event" data-event-id="${eventId}">
          Elimina
        </button>
      </div>
    </article>
  `;
}

function renderToolbar(filters) {
  return `
    <div class="org-events-toolbar">
      <input
        type="search"
        placeholder="Cerca per titolo, città o regione"
        value="${filters.query || ""}"
        data-events-filter="query"
      />

      <select data-events-filter="approvalStatus">
        <option value="all" ${filters.approvalStatus === "all" ? "selected" : ""}>Tutti gli stati</option>
        <option value="approved" ${filters.approvalStatus === "approved" ? "selected" : ""}>Approvati</option>
        <option value="pending" ${filters.approvalStatus === "pending" ? "selected" : ""}>In revisione</option>
        <option value="rejected" ${filters.approvalStatus === "rejected" ? "selected" : ""}>Respinti</option>
        <option value="blocked" ${filters.approvalStatus === "blocked" ? "selected" : ""}>Bloccati</option>
      </select>

      <select data-events-filter="privacy">
        <option value="all" ${filters.privacy === "all" ? "selected" : ""}>Pubblici e privati</option>
        <option value="public" ${filters.privacy === "public" ? "selected" : ""}>Solo pubblici</option>
        <option value="private" ${filters.privacy === "private" ? "selected" : ""}>Solo privati</option>
      </select>
    </div>
  `;
}

export function renderEventsList(state) {
  const listRoot = document.querySelector("[data-org-events-list]");
  if (!listRoot) return;

  const filteredEvents = applyEventFilters(state.events, state.filters);

  listRoot.innerHTML = filteredEvents.length
    ? `<section class="org-events-list">${filteredEvents.map(renderEventCard).join("")}</section>`
    : `<section class="org-event-empty">Nessun evento trovato.</section>`;
}

export function renderEventsPage(state) {
  const root = document.querySelector("[data-org-events-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `
      <h1>Eventi Organizer V2</h1>
      <p>Caricamento eventi...</p>
    `;
    return;
  }

  if (state.error) {
    root.innerHTML = `
      <h1>Eventi Organizer V2</h1>
      <section class="org-event-error">
        <p>Errore nel caricamento degli eventi.</p>
        <pre>${state.error}</pre>
      </section>
    `;
    return;
  }

  root.innerHTML = `
    <h1>Eventi Organizer V2</h1>
    <p>Lista reale degli eventi dell’organizzatore.</p>

    ${renderToolbar(state.filters)}

    <div data-org-events-list></div>
  `;

  renderEventsList(state);
}
