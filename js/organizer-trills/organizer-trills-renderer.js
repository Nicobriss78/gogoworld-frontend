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

export function renderOrganizerTrills(state) {
  const root = document.querySelector("[data-org-trills-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `<h1>Trilli</h1><p>Caricamento...</p>`;
    return;
  }

  if (state.error) {
    root.innerHTML = `<h1>Trilli</h1><p>${state.error}</p>`;
    return;
  }

  root.innerHTML = `
    <h1>Trilli</h1>

    <div class="org-trills-list">
      ${
        state.trills.length
          ? state.trills.map((t) => `
            <article class="org-trill-card">
              <div class="org-trill-title">${t.message}</div>

              <div class="org-trill-meta">
                Evento: ${t.event?.title || t.eventId?.title || "N/D"}<br/>
                Stato: ${mapStatusLabel(t.status)}
              </div>

              <div class="org-trill-actions">
                ${
                  canSendTrill(t.status)
                    ? `<button type="button" data-action="send" data-id="${t._id || t.id}" class="primary">Invia</button>`
                    : `<span>${mapStatusLabel(t.status)}</span>`
                }
              </div>
            </article>
          `).join("")
          : "<p>Nessun trill trovato.</p>"
      }
    </div>
  `;
}
