function getEventTitle(event) {
  return event?.title || "Evento";
}

export function renderOrganizerTrillForm(state) {
  const root = document.querySelector("[data-org-trill-form-root]");
  if (!root) return;

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
          <section class="org-trill-error">${state.error}</section>
          <div class="org-trill-actions" style="margin-top: 14px;">
            <a href="/pages/organizer-events-v2.html">Torna agli eventi</a>
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
          Evento: <strong>${getEventTitle(state.event)}</strong>
        </p>

        ${
          state.error
            ? `<section class="org-trill-error">${state.error}</section>`
            : ""
        }

        ${
          state.success
            ? `<section class="org-trill-success">${state.success}</section>`
            : ""
        }

        <form class="org-trill-form" data-org-trill-form>
          <input type="hidden" name="eventId" value="${state.eventId}" />

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
            <a href="/pages/organizer-event-detail-v2.html?id=${state.eventId}">
              Torna al dettaglio evento
            </a>
          </div>
        </form>
      </div>
    </section>
  `;
}
