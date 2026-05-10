import { applyEventFilters } from "./organizer-events-filters.js?v=7";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodeUrlValue(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

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
  return String(event?._id || event?.id || "").trim();
}

function withOrganizerReturn(href) {
  const params = new URLSearchParams(window.location.search);
  const fromDashboard = params.get("from") === "dashboard";
  const separator = href.includes("?") ? "&" : "?";

  if (fromDashboard) {
    return `${href}${separator}rootReturnTo=organizer-dashboard`;
  }

  return href;
}

function getActiveFilterLabel(filters) {
  if (filters.special === "no-participants") {
    return "Eventi approvati, futuri e senza partecipanti";
  }

  const labels = {
    approved: "Eventi approvati",
    pending: "Eventi in revisione",
    rejected: "Eventi respinti",
    blocked: "Eventi bloccati",
  };

  return labels[filters.approvalStatus] || "";
}

function renderDashboardFilterNotice(state) {
  const label = getActiveFilterLabel(state.filters);

  if (!state.sourceLabel && !label) return "";

  return `
    <section class="org-event-source-notice">
      <div>
        <strong>${escapeHtml(state.sourceLabel || "Filtro attivo")}</strong>
        ${label ? `<span>${escapeHtml(label)}</span>` : ""}
      </div>
      <button type="button" data-action="clear-dashboard-filter">Mostra tutti</button>
    </section>
  `;
}

function renderDeleteAction(eventId, state) {
  const safeEventId = escapeHtml(eventId);
  const isConfirming = state.confirmDeleteId === eventId;
  const isDeleting = state.deletingId === eventId;

  if (isConfirming) {
    return `
      <span>Confermi eliminazione?</span>
      <button type="button" class="danger" data-action="confirm-delete-event" data-event-id="${safeEventId}" ${isDeleting ? "disabled" : ""}>
        ${isDeleting ? "Eliminazione..." : "Conferma"}
      </button>
      <button type="button" data-action="cancel-delete-event" data-event-id="${safeEventId}" ${isDeleting ? "disabled" : ""}>
        Annulla
      </button>
    `;
  }

  return `
    <button type="button" class="danger" data-action="request-delete-event" data-event-id="${safeEventId}" ${state.deletingId ? "disabled" : ""}>
      Elimina
    </button>
  `;
}

function renderEventCard(event, state) {
  const eventId = getEventId(event);
  const encodedEventId = encodeUrlValue(eventId);

  const title = escapeHtml(event.title || "Evento senza titolo");
  const status = escapeHtml(event.approvalStatus || "pending");
  const visibility = escapeHtml(event.visibility || "public");
  const city = escapeHtml(event.city || "Città non indicata");
  const participants = Array.isArray(event.participants)
    ? event.participants.length
    : typeof event.participantsCount === "number"
      ? event.participantsCount
      : 0;
  const privacy = event.isPrivate ? "Privato" : "Pubblico";

  return `
    <article class="org-event-card" data-event-id="${escapeHtml(eventId)}">
      <h2>${title}</h2>

      <div class="org-event-meta">
        <span>Stato: ${status}</span>
        <span>Visibilità: ${visibility} · ${escapeHtml(privacy)}</span>
        <span>Luogo: ${city}</span>
        <span>Inizio: ${escapeHtml(formatDate(event.dateStart))}</span>
        <span>Fine: ${escapeHtml(formatDate(event.dateEnd))}</span>
        <span>Partecipanti: ${participants}</span>
      </div>

      <div class="org-event-actions">
        <a href="${escapeHtml(withOrganizerReturn(`/pages/organizer-event-detail-v2.html?id=${encodedEventId}`))}">Apri</a>
        <a href="${escapeHtml(withOrganizerReturn(`/pages/organizer-event-edit-v2.html?id=${encodedEventId}`))}">Modifica</a>
        ${renderDeleteAction(eventId, state)}
      </div>
    </article>
  `;
}

function renderToolbar(filters) {
  const query = escapeHtml(filters.query || "");

  return `
    <div class="org-events-toolbar">
      <a href="${escapeHtml(withOrganizerReturn("/pages/organizer-event-create-v2.html"))}">Crea nuovo evento</a>

      <input
        type="search"
        placeholder="Cerca per titolo, città o regione"
        value="${query}"
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

  listRoot.innerHTML = `
    ${state.actionMessage ? `<section class="org-event-success">${escapeHtml(state.actionMessage)}</section>` : ""}
    ${state.actionError ? `<section class="org-event-error">${escapeHtml(state.actionError)}</section>` : ""}
    ${
      filteredEvents.length
        ? `<section class="org-events-list">${filteredEvents.map((event) => renderEventCard(event, state)).join("")}</section>`
        : `<section class="org-event-empty">Nessun evento trovato.</section>`
    }
  `;
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
        <pre>${escapeHtml(state.error)}</pre>
      </section>
    `;
    return;
  }

  root.innerHTML = `
    <h1>Eventi Organizer V2</h1>
    <p>Lista reale degli eventi dell’organizzatore.</p>

    ${renderDashboardFilterNotice(state)}
    ${renderToolbar(state.filters)}

    <div data-org-events-list></div>
  `;

  renderEventsList(state);
}
