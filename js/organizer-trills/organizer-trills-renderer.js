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
          ? state.trills.map(t => `
            <article class="org-trill-card">
              <div class="org-trill-title">${t.message}</div>

              <div class="org-trill-meta">
                Evento: ${t.event?.title || t.eventId?.title || "N/D"}<br/>
                Stato: ${t.status}
              </div>

              <div class="org-trill-actions">
                ${
                  t.status !== "sent"
                    ? `<button data-action="send" data-id="${t._id}" class="primary">Invia</button>`
                    : `<span>Inviato</span>`
                }
              </div>
            </article>
          `).join("")
          : "<p>Nessun trill trovato.</p>"
      }
    </div>
  `;
}
