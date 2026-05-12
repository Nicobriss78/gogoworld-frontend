function normalizeStatus(status) {
  return String(status || "").toLowerCase().trim();
}

function mapStatusLabel(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "draft") return "Bozza";
  if (normalized === "scheduled") return "Programmato";
  if (normalized === "sent") return "Inviato";
  if (normalized === "blocked") return "Bloccato";
  if (normalized === "cancelled") return "Annullato";
  if (normalized === "expired") return "Scaduto";
  if (normalized === "failed") return "Fallito";

  return status || "N/D";
}

function mapTargetLabel(value) {
  const normalized = String(value || "").toLowerCase().trim();

  if (normalized === "nearby") return "Utenti vicini";
  if (normalized === "interested_not_checked_in") return "Interessati non presenti";
  if (normalized === "both") return "Vicini + interessati";

  return value || "Target non indicato";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTrillId(trill) {
  return String(trill?._id || trill?.id || "").trim();
}

function getTrillEvent(trill) {
  return trill?.event || trill?.eventId || {};
}

function getEventTitle(trill) {
  const event = getTrillEvent(trill);

  return (
    event?.title ||
    trill?.eventTitle ||
    "Evento non indicato"
  );
}

function getRadiusLabel(trill) {
  const radius = Number(trill?.radiusMeters || trill?.radius || 0);
  if (!radius) return "Raggio non indicato";
  if (radius >= 1000) return `${radius / 1000} km`;
  return `${radius} m`;
}

function isTrillEventPast(trill) {
  const event = getTrillEvent(trill);
  const end = event?.dateEnd ? new Date(event.dateEnd).getTime() : null;
  const start = event?.dateStart ? new Date(event.dateStart).getTime() : null;
  const reference = end || start;

  return Boolean(reference && reference < Date.now());
}

function canSendTrill(trill) {
  if (isTrillEventPast(trill)) return false;

  const normalized = normalizeStatus(trill.status);
  return normalized === "draft" || normalized === "scheduled";
}

function renderStatusBadge(status) {
  const normalized = normalizeStatus(status) || "unknown";

  return `
    <span class="org-trill-badge org-trill-badge--${escapeHtml(normalized)}">
      ${escapeHtml(mapStatusLabel(status))}
    </span>
  `;
}

function renderSmartNotice(trill) {
  const status = normalizeStatus(trill.status);
  const event = getTrillEvent(trill);
  const now = Date.now();

  const start = event?.dateStart ? new Date(event.dateStart).getTime() : null;
  const end = event?.dateEnd ? new Date(event.dateEnd).getTime() : null;

  const isFuture = start && start > now;
  const isInProgress = start && end && start <= now && end >= now;
  const isPast = end && end < now;

  if (status === "draft") {
    if (isInProgress) {
      return `
        <div class="org-trill-smart-notice">
          Evento in corso: valuta invio immediato.
        </div>
      `;
    }

    if (isFuture) {
      return `
        <div class="org-trill-smart-notice">
          Bozza pronta: inviala vicino all’inizio dell’evento.
        </div>
      `;
    }

    if (isPast) {
      return `
        <div class="org-trill-smart-notice org-trill-smart-notice--danger">
          Evento terminato: trillo non più inviabile.
        </div>
      `;
    }

    return `
      <div class="org-trill-smart-notice">
        Bozza pronta: puoi inviarla quando l’evento è nel momento giusto.
      </div>
    `;
  }

  if (status === "scheduled") {
    return `
      <div class="org-trill-smart-notice">
        Trillo programmato: controlla orario e targeting prima dell’invio.
      </div>
    `;
  }

  if (status === "sent") {
    return `
      <div class="org-trill-smart-notice org-trill-smart-notice--done">
        Trillo già inviato.
      </div>
    `;
  }

  if (status === "blocked" || status === "failed") {
    return `
      <div class="org-trill-smart-notice org-trill-smart-notice--danger">
        Trillo non operativo: verifica stato o moderazione.
      </div>
    `;
  }

  return "";
}

function renderActions(trill, state) {
  const id = getTrillId(trill);

  if (!canSendTrill(trill)) {
    if (isTrillEventPast(trill) && normalizeStatus(trill.status) === "draft") {
      return `
        <button type="button" class="secondary" disabled>
          Trillo non disponibile
        </button>
      `;
    }

    return "";
  }

  if (!id) {
    return `<span class="org-trill-error">ID trillo non valido</span>`;
  }

  const isConfirming = state.confirmSendId === id;
  const isSending = state.sendingId === id;

  if (isConfirming) {
    return `
      <span class="org-trill-confirm-text">Confermi l’invio?</span>
      <button
        type="button"
        data-action="confirm-send"
        data-id="${escapeHtml(id)}"
        class="primary"
        ${isSending ? "disabled" : ""}
      >
        ${isSending ? "Invio..." : "Conferma"}
      </button>
      <button
        type="button"
        data-action="cancel-send"
        class="secondary"
        ${isSending ? "disabled" : ""}
      >
        Annulla
      </button>
    `;
  }

  return `
    <button
      type="button"
      data-action="request-send"
      data-id="${escapeHtml(id)}"
      class="primary"
      ${state.sendingId ? "disabled" : ""}
    >
      Invia
    </button>
  `;
}

function getActiveFilterLabel(filter) {
  if (filter === "draft") return "Trilli in bozza";
  return "";
}

function renderTrillsFilterNotice(state) {
  const label = getActiveFilterLabel(state.activeFilter);

  if (!state.sourceLabel && !label) return "";

  return `
    <section class="org-trill-source-notice">
      <div>
        <strong>${escapeHtml(state.sourceLabel || "Filtro attivo")}</strong>
        ${label ? `<span>${escapeHtml(label)}</span>` : ""}
      </div>
      <button type="button" data-action="clear-trills-filter">Mostra tutti</button>
    </section>
  `;
}

function renderTrillCard(trill, state) {
  const message = trill.message || "Messaggio non disponibile";
  const eventTitle = getEventTitle(trill);
  const target = mapTargetLabel(trill.targetingMode);
  const radius = getRadiusLabel(trill);
  const createdAt = formatDate(trill.createdAt);
  const sentAt = formatDate(trill.sentAt || trill.deliveredAt);

  return `
    <article class="org-trill-card">
      <div class="org-trill-card__header">
        <div>
          <h2>${escapeHtml(message)}</h2>
          <p>Evento: ${escapeHtml(eventTitle)}</p>
        </div>
        ${renderStatusBadge(trill.status)}
      </div>

      <div class="org-trill-card__meta">
        <span>Target: ${escapeHtml(target)}</span>
        <span>Raggio: ${escapeHtml(radius)}</span>
        ${createdAt ? `<span>Creato: ${escapeHtml(createdAt)}</span>` : ""}
        ${sentAt ? `<span>Inviato: ${escapeHtml(sentAt)}</span>` : ""}
      </div>

      ${renderSmartNotice(trill)}

      <div class="org-trill-actions">
        ${renderActions(trill, state)}
      </div>
    </article>
  `;
}

export function renderOrganizerTrills(state) {
  const root = document.querySelector("[data-org-trills-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `
      <h1>Trilli</h1>
      <p>Caricamento...</p>
    `;
    return;
  }

  if (state.error) {
    root.innerHTML = `
      <h1>Trilli</h1>
      <p>${escapeHtml(state.error)}</p>
    `;
    return;
  }

  root.innerHTML = `
    <h1>Trilli</h1>
    ${renderTrillsFilterNotice(state)}

    ${
      state.actionMessage
        ? `<p class="org-trill-success">${escapeHtml(state.actionMessage)}</p>`
        : ""
    }
    ${
      state.actionError
        ? `<p class="org-trill-error">${escapeHtml(state.actionError)}</p>`
        : ""
    }

    <div class="org-trills-list">
      ${
        state.trills.length
          ? state.trills.map((trill) => renderTrillCard(trill, state)).join("")
          : "<p>Nessun trill trovato.</p>"
      }
    </div>
  `;
}
