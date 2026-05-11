import {
  applyEventFilters,
  getApprovalStatus,
  getEventDate,
  getEventEndDate,
  getParticipantsCount,
  isApprovedUpcomingWithoutParticipants,
  isOngoingEvent,
  isPastEvent,
  isPrivateEvent,
  needsCorrection,
} from "./organizer-events-filters.js?v=8";

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

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data non valida";
  }

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
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

function getStatusLabel(status) {
  const labels = {
    approved: "Approvato",
    pending: "In revisione",
    rejected: "Respinto",
    blocked: "Bloccato",
  };

  return labels[status] || "Da verificare";
}

function getTemporalLabel(event) {
  if (isOngoingEvent(event)) return "In corso";
  if (isPastEvent(event)) return "Passato";
  return "Futuro";
}

function getActiveFilterLabel(filters) {
  if (filters.special === "no-participants") {
    return "Eventi approvati, futuri e senza partecipanti";
  }

  if (filters.special === "needs-correction") {
    return "Eventi da correggere";
  }

  const labels = {
    approved: "Eventi approvati",
    pending: "Eventi in revisione",
    rejected: "Eventi respinti",
    blocked: "Eventi bloccati",
  };

  if (filters.approvalStatus && filters.approvalStatus !== "all") {
  return labels[filters.approvalStatus] || "";
}

return "";
}

function buildSummary(events) {
  const approved = events.filter((event) => getApprovalStatus(event) === "approved").length;
  const pending = events.filter((event) => getApprovalStatus(event) === "pending").length;
  const rejected = events.filter((event) => getApprovalStatus(event) === "rejected").length;
  const blocked = events.filter((event) => getApprovalStatus(event) === "blocked").length;
  const privateEvents = events.filter(isPrivateEvent).length;
  const noParticipants = events.filter(isApprovedUpcomingWithoutParticipants).length;

  return {
    total: events.length,
    approved,
    pending,
    rejected,
    blocked,
    privateEvents,
    noParticipants,
    toFix: rejected + blocked,
  };
}

function renderSummaryCard({ label, value, hint, action, key, filterValue, tone = "default" }) {
  const attrs = action
    ? ` role="button" tabindex="0" data-action="${escapeHtml(action)}" data-filter-key="${escapeHtml(key)}" data-filter-value="${escapeHtml(filterValue)}"`
    : "";

  return `
    <article class="org-events-summary-card org-events-summary-card--${escapeHtml(tone)}"${attrs}>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)}</small>
    </article>
  `;
}

function renderSummary(events) {
  const summary = buildSummary(events);

  return `
    <section class="org-events-summary" aria-label="Riepilogo eventi">
      ${renderSummaryCard({
        label: "Eventi totali",
        value: summary.total,
        hint: "Tutti gli eventi",
      })}
      ${renderSummaryCard({
        label: "Approvati",
        value: summary.approved,
        hint: "Visibili e utilizzabili",
        action: "apply-events-filter",
        key: "approvalStatus",
        filterValue: "approved",
        tone: "good",
      })}
      ${renderSummaryCard({
        label: "In revisione",
        value: summary.pending,
        hint: "Da monitorare",
        action: "apply-events-filter",
        key: "approvalStatus",
        filterValue: "pending",
        tone: summary.pending ? "warning" : "default",
      })}
      ${renderSummaryCard({
        label: "Da correggere",
        value: summary.toFix,
        hint: "Respinti o bloccati",
        action: "apply-events-filter",
        key: "special",
        filterValue: "needs-correction",
        tone: summary.toFix ? "danger" : "default",
      })}
      ${renderSummaryCard({
        label: "Privati",
        value: summary.privateEvents,
        hint: "Con accesso controllato",
        action: "apply-events-filter",
        key: "privacy",
        filterValue: "private",
      })}
      ${renderSummaryCard({
        label: "Da promuovere",
        value: summary.noParticipants,
        hint: "Futuri senza partecipanti",
        action: "apply-events-filter",
        key: "special",
        filterValue: "no-participants",
        tone: summary.noParticipants ? "warning" : "default",
      })}
    </section>
  `;
}

function renderDashboardFilterNotice(state) {
  const label = getActiveFilterLabel(state.filters);

  if (!state.sourceLabel && !label) return "";

  return `
    <section class="org-event-source-notice">
      <div>
        <strong>${escapeHtml(state.sourceLabel || "Filtro aperto dalla Dashboard")}</strong>
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
      <span class="org-event-delete-confirm">Confermi eliminazione?</span>
      <button
        type="button"
        class="danger"
        data-action="confirm-delete-event"
        data-event-id="${safeEventId}"
        ${isDeleting ? "disabled" : ""}
      >
        ${isDeleting ? "Eliminazione..." : "Conferma"}
      </button>
      <button
        type="button"
        data-action="cancel-delete-event"
        data-event-id="${safeEventId}"
        ${isDeleting ? "disabled" : ""}
      >
        Annulla
      </button>
    `;
  }

  return `
    <button
      type="button"
      class="danger"
      data-action="request-delete-event"
      data-event-id="${safeEventId}"
      ${state.deletingId ? "disabled" : ""}
    >
      Elimina
    </button>
  `;
}

function renderSmartNotice(event) {
  const participants = getParticipantsCount(event);

  if (needsCorrection(event)) {
    return `
      <div class="org-event-card__notice org-event-card__notice--danger">
        Evento da correggere prima di essere pienamente operativo.
      </div>
    `;
  }

  if (getApprovalStatus(event) === "approved" && isOngoingEvent(event) && participants === 0) {
    return `
      <div class="org-event-card__notice org-event-card__notice--warning">
        Evento in corso senza partecipanti. Valuta un trillo immediato.
      </div>
    `;
  }

  if (isApprovedUpcomingWithoutParticipants(event)) {
    return `
      <div class="org-event-card__notice org-event-card__notice--warning">
        Evento futuro senza partecipanti. Valuta trillo o promozione.
      </div>
    `;
  }

  return "";
}

function getSmartStatusText(event) {
  const status = getApprovalStatus(event);
  const participants = getParticipantsCount(event);

  if (needsCorrection(event)) return "Richiede modifiche";
  if (status === "approved" && isOngoingEvent(event) && participants === 0) {
    return "Evento in corso senza partecipanti";
  }
  if (isApprovedUpcomingWithoutParticipants(event)) return "Potrebbe aver bisogno di promozione";
  if (status === "pending" && isPastEvent(event)) return "Evento mai approvato";
  if (status === "pending") return "In attesa di approvazione";
  if (isPrivateEvent(event)) return "Accesso controllato attivo";
  if (status === "approved") return "Evento operativo";

  return "Da verificare";
}

function getPrimaryAction(event, encodedEventId) {
  const status = getApprovalStatus(event);
  const privateEvent = isPrivateEvent(event);

  if (needsCorrection(event)) {
    return {
      id: "edit",
      label: "Correggi evento",
      href: withOrganizerReturn(`/pages/organizer-event-edit-v2.html?id=${encodedEventId}`),
    };
  }

  if (isApprovedUpcomingWithoutParticipants(event) && status === "approved") {
    return {
      id: "trill",
      label: "Crea trillo",
      href: withOrganizerReturn(`/pages/organizer-trill-create-v2.html?eventId=${encodedEventId}`),
    };
  }

  if (privateEvent) {
    return {
      id: "access",
      label: "Gestisci accessi",
      href: withOrganizerReturn(`/pages/organizer-event-access-v2.html?id=${encodedEventId}`),
    };
  }

  if (status === "pending") {
    return {
      id: "edit",
      label: "Modifica evento",
      href: withOrganizerReturn(`/pages/organizer-event-edit-v2.html?id=${encodedEventId}`),
    };
  }

  return {
    id: "open",
    label: "Apri evento",
    href: withOrganizerReturn(`/pages/organizer-event-detail-v2.html?id=${encodedEventId}`),
  };
}

function renderPrimaryAction(action) {
  return `
    <a class="org-event-primary-action" href="${escapeHtml(action.href)}">
      ${escapeHtml(action.label)}
    </a>
  `;
}

function renderSecondaryActions(event, eventId, encodedEventId, state, primaryActionId) {
  const status = getApprovalStatus(event);
  const privateEvent = isPrivateEvent(event);

  const actions = [
    {
      id: "open",
      label: "Apri",
      href: withOrganizerReturn(`/pages/organizer-event-detail-v2.html?id=${encodedEventId}`),
      visible: primaryActionId !== "open",
    },
    {
      id: "edit",
      label: "Modifica",
      href: withOrganizerReturn(`/pages/organizer-event-edit-v2.html?id=${encodedEventId}`),
      visible: primaryActionId !== "edit",
    },
    {
      id: "access",
      label: "Accessi",
      href: withOrganizerReturn(`/pages/organizer-event-access-v2.html?id=${encodedEventId}`),
      visible: privateEvent && primaryActionId !== "access",
    },
    {
      id: "trill",
      label: "Trillo",
      href: withOrganizerReturn(`/pages/organizer-trill-create-v2.html?eventId=${encodedEventId}`),
      visible: status === "approved" && primaryActionId !== "trill",
    },
  ];

  return `
    <div class="org-event-secondary-actions">
      ${actions
        .filter((action) => action.visible)
        .map((action) => `<a href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`)
        .join("")}
      ${renderDeleteAction(eventId, state)}
    </div>
  `;
}

function renderEventCard(event, state) {
  const eventId = getEventId(event);
  const encodedEventId = encodeUrlValue(eventId);

  const title = escapeHtml(event.title || "Evento senza titolo");
  const status = getApprovalStatus(event);
  const city = escapeHtml(event.city || event.region || "Luogo non indicato");
  const participants = getParticipantsCount(event);
  const privateEvent = isPrivateEvent(event);
  const temporalLabel = getTemporalLabel(event);
  const primaryAction = getPrimaryAction(event, encodedEventId);

  return `
    <article class="org-event-card org-event-card--${escapeHtml(status)}" data-event-id="${escapeHtml(eventId)}">
      <div class="org-event-card__header">
        <div>
          <h2>${title}</h2>
          <p>${city} · ${escapeHtml(formatDate(getEventDate(event)))}</p>
        </div>

        <div class="org-event-card__badges">
          <span class="org-event-badge org-event-badge--${escapeHtml(status)}">
            ${escapeHtml(getStatusLabel(status))}
          </span>
          <span class="org-event-badge">${privateEvent ? "Privato" : "Pubblico"}</span>
          <span class="org-event-badge">${escapeHtml(temporalLabel)}</span>
        </div>
      </div>

      <div class="org-event-card__meta">
        <span>Fine: ${escapeHtml(formatDate(getEventEndDate(event)))}</span>
        <span>${participants ? `${participants} partecipanti` : "Nessun partecipante"}</span>
      </div>

      <div class="org-event-card__smart-status">
        ${escapeHtml(getSmartStatusText(event))}
      </div>

      ${renderSmartNotice(event)}

      <div class="org-event-card__actions">
        ${renderPrimaryAction(primaryAction)}
        ${renderSecondaryActions(event, eventId, encodedEventId, state, primaryAction.id)}
      </div>
    </article>
  `;
}

function renderToolbar(filters, total, filtered) {
  const query = escapeHtml(filters.query || "");

  return `
    <section class="org-events-toolbar-panel">
      <div class="org-events-toolbar">
        <input
          type="search"
          placeholder="Cerca titolo, città, luogo o categoria"
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

        <select data-events-filter="temporal">
          <option value="all" ${filters.temporal === "all" ? "selected" : ""}>Tutti i periodi</option>
          <option value="upcoming" ${filters.temporal === "upcoming" ? "selected" : ""}>Futuri</option>
          <option value="ongoing" ${filters.temporal === "ongoing" ? "selected" : ""}>In corso</option>
          <option value="past" ${filters.temporal === "past" ? "selected" : ""}>Passati</option>
        </select>

        <select data-events-filter="special">
          <option value="all" ${filters.special === "all" ? "selected" : ""}>Nessun filtro speciale</option>
          <option value="no-participants" ${filters.special === "no-participants" ? "selected" : ""}>Senza partecipanti</option>
          <option value="needs-correction" ${filters.special === "needs-correction" ? "selected" : ""}>Da correggere</option>
        </select>
      </div>

      <div class="org-events-toolbar-meta">
        <span>${escapeHtml(filtered)} di ${escapeHtml(total)} eventi</span>
        <button type="button" data-action="reset-events-filters">Reset filtri</button>
      </div>
    </section>
  `;
}

function renderEmpty(message) {
  return `<section class="org-event-empty">${escapeHtml(message)}</section>`;
}

export function renderEventsList(state) {
  const listRoot = document.querySelector("[data-org-events-list]");
  if (!listRoot) return;

  const filteredEvents = applyEventFilters(state.events, state.filters);

  listRoot.innerHTML = `
    ${
      state.actionMessage
        ? `<section class="org-event-success">${escapeHtml(state.actionMessage)}</section>`
        : ""
    }
    ${
      state.actionError
        ? `<section class="org-event-error">${escapeHtml(state.actionError)}</section>`
        : ""
    }
    ${
      filteredEvents.length
        ? `<section class="org-events-list">${filteredEvents.map((event) => renderEventCard(event, state)).join("")}</section>`
        : renderEmpty("Nessun evento trovato con i filtri attuali.")
    }
  `;
}

export function renderEventsPage(state) {
  const root = document.querySelector("[data-org-events-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `
      <section class="org-events-hero">
        <h1>Eventi</h1>
        <p>Caricamento eventi...</p>
      </section>
    `;
    return;
  }

  if (state.error) {
    root.innerHTML = `
      <section class="org-events-hero">
        <h1>Eventi</h1>
        <p>Non riesco a caricare gli eventi in questo momento.</p>
      </section>

      <section class="org-event-error">
        <p>Errore nel caricamento degli eventi.</p>
        <pre>${escapeHtml(state.error)}</pre>
      </section>
    `;
    return;
  }

  const filteredEvents = applyEventFilters(state.events, state.filters);
  const fromDashboard = new URLSearchParams(window.location.search).get("from") === "dashboard";

  root.innerHTML = `
    <section class="org-events-hero">
      <div>
        <h1>Eventi</h1>
        <p>Gestisci stato, visibilità e operatività dei tuoi eventi.</p>
      </div>

      <div class="org-events-hero__actions">
        ${fromDashboard ? `<a href="/pages/organizer-dashboard-v2.html">Torna Dashboard</a>` : ""}
        <a href="${escapeHtml(withOrganizerReturn("/pages/organizer-event-create-v2.html"))}">Crea evento</a>
      </div>
    </section>

    ${renderSummary(state.events)}
    ${renderToolbar(state.filters, state.events.length, filteredEvents.length)}
    ${renderDashboardFilterNotice(state)}

    <div data-org-events-list></div>
  `;

  renderEventsList(state);
    }
