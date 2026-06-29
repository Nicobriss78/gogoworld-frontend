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
function isPastEvent(event) {
  const end = event?.dateEnd ? new Date(event.dateEnd) : null;
  const start = event?.dateStart ? new Date(event.dateStart) : null;
  const reference = end || start;

  return Boolean(reference && reference.getTime() < Date.now());
}

function isApprovedEvent(event) {
  return String(event?.approvalStatus || "").toLowerCase() === "approved";
}
function getEventTitle(event) {
  return event?.title || "Evento";
}

export function renderOrganizerTrillForm(state) {
  const root = document.querySelector("[data-org-trill-form-root]");
  if (!root) return;

  const eventId = String(state.eventId || "").trim();
  const safeEventId = escapeHtml(eventId);
  const encodedEventId = encodeUrlValue(eventId);
  const safeEventTitle = escapeHtml(getEventTitle(state.event));
  const safeError = escapeHtml(state.error);
  const safeSuccess = escapeHtml(state.success);
  if (state.event) {
  if (!isApprovedEvent(state.event)) {
    root.innerHTML = `
      <section class="org-trill-form-page">
        <div class="org-trill-form-card">
          <h1>Crea trillo</h1>
          <section class="org-trill-error">
            I trilli sono disponibili solo per eventi approvati.
          </section>
          <div class="org-trill-actions" style="margin-top:14px;">
            <a href="${escapeHtml(getBackHref())}">${escapeHtml(getBackLabel())}</a>
          </div>
        </div>
      </section>
    `;
    return;
  }

  if (isPastEvent(state.event)) {
    root.innerHTML = `
      <section class="org-trill-form-page">
        <div class="org-trill-form-card">
          <h1>Crea trillo</h1>
          <section class="org-trill-error">
            Questo evento è terminato. Non puoi creare nuovi trilli.
          </section>
          <div class="org-trill-actions" style="margin-top:14px;">
            <a href="${escapeHtml(getBackHref())}">${escapeHtml(getBackLabel())}</a>
          </div>
        </div>
      </section>
    `;
    return;
  }
}
  if (state.loading) {
    root.innerHTML = `
      <section class="org-trill-form-page">
        <div class="org-trill-form-card">
          <h1>Crea trillo</h1>
          <p>Caricamento evento...</p>
        </div>
      </section>
    `;
    return;
  }

  if (state.error && !state.event) {
    root.innerHTML = `
      <section class="org-trill-form-page">
        <div class="org-trill-form-card">
          <h1>Crea trillo</h1>
          <section class="org-trill-error">${safeError}</section>
          <div class="org-trill-actions" style="margin-top: 14px;">
            <a href="${escapeHtml(getBackHref())}">${escapeHtml(getBackLabel())}</a>
          </div>
        </div>
      </section>
    `;
    return;
  }

  root.innerHTML = `
    <section class="org-trill-form-page">
      <div class="org-trill-form-card">
        <h1>Crea trillo</h1>
        <p class="org-trill-muted">
          Evento: <strong>${safeEventTitle}</strong>
        </p>

        ${
          state.error
            ? `<section class="org-trill-error">${safeError}</section>`
            : ""
        }

        ${
          state.success
            ? `<section class="org-trill-success">${safeSuccess}</section>`
            : ""
        }

        <form class="org-trill-form" data-org-trill-form>
          <input type="hidden" name="eventId" value="${safeEventId}" />

          <div class="org-trill-field">
            <label for="trill-message">Messaggio</label>
            <textarea
              id="trill-message"
              name="message"
              maxlength="240"
              required
              placeholder="Esempio: Evento appena iniziato 🚀"
            ></textarea>
            <span class="org-trill-muted">Minimo 4 caratteri, massimo 240.</span>
          </div>

          <div class="org-trill-field">
            <label for="trill-targeting">Target</label>
            <select id="trill-targeting" name="targetingMode">
              <option value="nearby">Utenti vicini</option>
              <option value="interested_not_checked_in">Interessati non ancora presenti</option>
              <option value="both">Entrambi</option>
            </select>
          </div>
          <div class="org-trill-field">
            <label for="trill-priority">Priorità</label>
            <select id="trill-priority" name="priority">
              <option value="soft">Morbido</option>
              <option value="live" selected>Live</option>
              <option value="urgent">Urgente</option>
              <option value="final_call">Ultima chiamata</option>
            </select>
<span class="org-trill-muted">
La priorità aiuta a distinguere il tono e l’urgenza del trillo.
</span>
</div>
          <div class="org-trill-field">
            <label for="trill-radius">Raggio</label>
            <select id="trill-radius" name="radiusMeters">
              <option value="500">500 metri</option>
              <option value="1000" selected>1 km</option>
            </select>
            <span class="org-trill-muted">
              Per i trilli base il limite massimo attuale è 1 km.
            </span>
          </div>

          <div class="org-trill-actions">
            <button type="submit" ${state.saving ? "disabled" : ""}>
              ${state.saving ? "Creazione..." : "Crea bozza trillo"}
            </button>
            <a href="${escapeHtml(withCurrentReturn(`/pages/organizer-event-detail-v2.html?id=${encodedEventId}`))}">
  Torna al dettaglio evento
</a>
          </div>
        </form>
      </div>
    </section>
  `;
}
