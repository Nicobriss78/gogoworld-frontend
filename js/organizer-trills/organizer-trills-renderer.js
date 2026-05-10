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

function canSendTrill(status) {
  const normalized = normalizeStatus(status);
  return normalized === "draft" || normalized === "scheduled";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTrillId(trill) {
  return String(trill?._id || trill?.id || "").trim();
}

function renderActions(trill, state) {
  const id = getTrillId(trill);
  const statusLabel = mapStatusLabel(trill.status);

  if (!canSendTrill(trill.status)) {
    return `<span>${escapeHtml(statusLabel)}</span>`;
  }

  if (!id) {
    return `<span class="org-trill-error">ID trillo non valido</span>`;
  }

  const isConfirming = state.confirmSendId === id;
  const isSending = state.sendingId === id;

  if (isConfirming) {
    return `
      <span class="org-trill-confirm-text">Confermi l’invio?</span>
      <button type="button" data-action="confirm-send" data-id="${escapeHtml(id)}" class="primary" ${isSending ? "disabled" : ""}>
        ${isSending ? "Invio..." : "Conferma"}
      </button>
      <button type="button" data-action="cancel-send" class="secondary" ${isSending ? "disabled" : ""}>
        Annulla
      </button>
    `;
  }

  return `
    <button type="button" data-action="request-send" data-id="${escapeHtml(id)}" class="primary" ${state.sendingId ? "disabled" : ""}>
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
export function renderOrganizerTrills(state) {
  const root = document.querySelector("[data-org-trills-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `<h1>Trilli</h1><p>Caricamento...</p>`;
    return;
  }

  if (state.error) {
    root.innerHTML = `<h1>Trilli</h1><p>${escapeHtml(state.error)}</p>`;
    return;
  }

  root.innerHTML = `
    <h1>Trilli</h1>

    ${state.actionMessage ? `<p class="org-trill-success">${escapeHtml(state.actionMessage)}</p>` : ""}
    ${state.actionError ? `<p class="org-trill-error">${escapeHtml(state.actionError)}</p>` : ""}

    <div class="org-trills-list">
      ${
        state.trills.length
          ? state.trills.map((t) => {
              const eventTitle = t.event?.title || t.eventId?.title || "N/D";

              return `
                <article class="org-trill-card">
                  <div class="org-trill-title">${escapeHtml(t.message)}</div>

                  <div class="org-trill-meta">
                    Evento: ${escapeHtml(eventTitle)}<br/>
                    Stato: ${escapeHtml(mapStatusLabel(t.status))}
                  </div>

                  <div class="org-trill-actions">
                    ${renderActions(t, state)}
                  </div>
                </article>
              `;
            }).join("")
          : "<p>Nessun trill trovato.</p>"
      }
    </div>
  `;
}
