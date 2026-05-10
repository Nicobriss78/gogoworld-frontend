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
function getRootReturnTo() {
  return new URLSearchParams(window.location.search).get("rootReturnTo") || "";
}

function getBackHref() {
  const rootReturnTo = getRootReturnTo();

  if (rootReturnTo === "organizer-dashboard") {
    return "/pages/organizer-dashboard-v2.html";
  }

  return "/pages/organizer-events-v2.html";
}

function getBackLabel() {
  return getRootReturnTo() === "organizer-dashboard"
    ? "Torna alla Dashboard"
    : "Torna agli eventi";
}

function withCurrentReturn(href) {
  const rootReturnTo = getRootReturnTo();
  if (!rootReturnTo) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}rootReturnTo=${encodeURIComponent(rootReturnTo)}`;
}
function formatDate(value) {
  if (!value) return "Data non disponibile";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data non valida";

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

function canEditEvent(event) {
  return event?.approvalStatus !== "blocked";
}

function renderModeration(event) {
  const reason = event?.moderation?.reason || "";
  const notes = event?.moderation?.notes || "";

  if (!reason && !notes) {
    return `<p>Nessuna nota di moderazione.</p>`;
  }

  return `
    ${reason ? `<p><strong>Motivo:</strong> ${escapeHtml(reason)}</p>` : ""}
    ${notes ? `<p><strong>Note:</strong> ${escapeHtml(notes)}</p>` : ""}
  `;
}

function renderDeleteAction(state) {
  if (state.confirmDelete) {
    return `
      <span>Confermi eliminazione?</span>
      <button type="button" class="danger" data-action="confirm-delete-event" ${state.deleting ? "disabled" : ""}>
        ${state.deleting ? "Eliminazione..." : "Conferma"}
      </button>
      <button type="button" data-action="cancel-delete-event" ${state.deleting ? "disabled" : ""}>
        Annulla
      </button>
    `;
  }

  return `
    <button type="button" class="danger" data-action="request-delete-event" ${state.deleting ? "disabled" : ""}>
      Elimina evento
    </button>
  `;
}

export function renderEventDetail(state) {
  const root = document.querySelector("[data-org-event-detail-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `
      <h1>Dettaglio evento</h1>
      <p>Caricamento evento...</p>
    `;
    return;
  }

  if (state.error) {
    root.innerHTML = `
      <h1>Dettaglio evento</h1>
      <section class="org-event-detail-error">${escapeHtml(state.error)}</section>
      <p><a href="${escapeHtml(getBackHref())}">${escapeHtml(getBackLabel())}</a></p>
    `;
    return;
  }

  const event = state.event || {};
  const eventId = getEventId(event);
  const encodedEventId = encodeUrlValue(eventId);
  const participants = Array.isArray(event.participants) ? event.participants.length : 0;
  const isPrivate = Boolean(event.isPrivate || event.visibility === "private");
  const editable = canEditEvent(event);

  root.innerHTML = `
    <h1>${escapeHtml(event.title || "Evento senza titolo")}</h1>
    <p>Hub operativo evento Organizer V2.</p>

    ${state.actionMessage ? `<section class="org-event-detail-success">${escapeHtml(state.actionMessage)}</section>` : ""}
    ${state.actionError ? `<section class="org-event-detail-error">${escapeHtml(state.actionError)}</section>` : ""}

    <section class="org-event-detail-card">
      <h2>Dati evento</h2>
      <p><strong>Stato approvazione:</strong> ${escapeHtml(event.approvalStatus || "pending")}</p>
      <p><strong>Visibilità:</strong> ${escapeHtml(event.visibility || "public")}</p>
      <p><strong>Privato:</strong> ${isPrivate ? "Sì" : "No"}</p>
      <p><strong>Codice accesso:</strong> ${escapeHtml(event.accessCode || "N/D")}</p>
      <p><strong>Città:</strong> ${escapeHtml(event.city || "N/D")}</p>
      <p><strong>Regione:</strong> ${escapeHtml(event.region || "N/D")}</p>
      <p><strong>Paese:</strong> ${escapeHtml(event.country || "N/D")}</p>
      <p><strong>Inizio:</strong> ${escapeHtml(formatDate(event.dateStart))}</p>
      <p><strong>Fine:</strong> ${escapeHtml(formatDate(event.dateEnd))}</p>
      <p><strong>Partecipanti:</strong> ${participants}</p>
    </section>

    <section class="org-event-detail-card">
      <h2>Descrizione</h2>
      <p>${escapeHtml(event.description || "Nessuna descrizione.")}</p>
    </section>

    <section class="org-event-detail-card">
      <h2>Moderazione</h2>
      ${renderModeration(event)}
    </section>

    <section class="org-event-detail-card">
      <h2>Azioni operative</h2>

      <div class="org-event-detail-actions">
        ${
          editable && eventId
            ? `<a href="${escapeHtml(withCurrentReturn(`/pages/organizer-event-edit-v2.html?id=${encodedEventId}`))}">Modifica</a>`
            : `<button type="button" disabled>Modifica bloccata</button>`
        }

        ${
          isPrivate && eventId
            ? `<a href="${escapeHtml(withCurrentReturn(`/pages/organizer-event-access-v2.html?id=${encodedEventId}`))}">Accessi privati</a>`
            : `<button type="button" disabled>Accessi privati</button>`
        }

        <button type="button" data-action="open-room" data-event-id="${escapeHtml(eventId)}" ${eventId || state.openingRoom ? "" : "disabled"} ${state.openingRoom ? "disabled" : ""}>
          ${state.openingRoom ? "Apertura room..." : "Apri room"}
        </button>

        ${
          eventId
            ? `<a href="${escapeHtml(withCurrentReturn(`/pages/organizer-trill-create-v2.html?eventId=${encodedEventId}`))}">Crea trillo</a>`
            : `<button type="button" disabled>Crea trillo</button>`
        }

        <button type="button" disabled title="Funzione Promozioni Organizer V2 non ancora implementata">
          Crea promo
        </button>

        ${renderDeleteAction(state)}

        <a href="/pages/organizer-events-v2.html">Torna agli eventi</a>
      </div>
    </section>
  `;
}
