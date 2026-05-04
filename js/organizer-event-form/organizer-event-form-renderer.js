function checked(value) {
  return value ? "checked" : "";
}

function selected(current, value) {
  return current === value ? "selected" : "";
}

export function renderEventForm(state) {
  const root = document.querySelector("[data-org-event-form-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `
      <h1>${state.mode === "edit" ? "Modifica evento" : "Crea evento"}</h1>
      <p>Caricamento...</p>
    `;
    return;
  }

  const event = state.event;

  root.innerHTML = `
    <h1>${state.mode === "edit" ? "Modifica evento" : "Crea evento"}</h1>
    <p>Form evento V2 minimale, pronto per evoluzione avanzata.</p>

    ${state.error ? `<section class="org-event-error">${state.error}</section>` : ""}
    ${state.success ? `<section class="org-event-success">${state.success}</section>` : ""}

    <form class="org-event-form" data-org-event-form>
      <section class="org-event-box">
        <div class="org-event-field">
          <label for="title">Titolo *</label>
          <input id="title" name="title" type="text" value="${event.title || ""}" required />
        </div>

        <div class="org-event-field">
          <label for="description">Descrizione *</label>
          <textarea id="description" name="description" required>${event.description || ""}</textarea>
        </div>

        <div class="org-event-row">
          <div class="org-event-field">
            <label for="category">Categoria</label>
            <input id="category" name="category" type="text" value="${event.category || ""}" />
          </div>

          <div class="org-event-field">
            <label for="type">Tipo</label>
            <input id="type" name="type" type="text" value="${event.type || ""}" />
          </div>
        </div>
      </section>

      <section class="org-event-box">
        <div class="org-event-field">
          <label for="venueName">Nome luogo</label>
          <input id="venueName" name="venueName" type="text" value="${event.venueName || ""}" />
        </div>

        <div class="org-event-row">
          <div class="org-event-field">
            <label for="city">Città</label>
            <input id="city" name="city" type="text" value="${event.city || ""}" />
          </div>

          <div class="org-event-field">
            <label for="region">Regione</label>
            <input id="region" name="region" type="text" value="${event.region || ""}" />
          </div>

          <div class="org-event-field">
            <label for="country">Paese *</label>
            <input id="country" name="country" type="text" value="${event.country || "Italia"}" required />
          </div>
        </div>
      </section>

      <section class="org-event-box">
        <div class="org-event-field">
          <label for="dateStart">Data inizio *</label>
          <input id="dateStart" name="dateStart" type="datetime-local" value="${event.dateStart || ""}" required />
        </div>

        <div class="org-event-field">
          <label for="dateEnd">Data fine * — suggerita automaticamente ma modificabile</label>
          <input id="dateEnd" name="dateEnd" type="datetime-local" value="${event.dateEnd || ""}" required />
        </div>
      </section>

      <section class="org-event-box">
        <div class="org-event-field">
          <label>
            <input name="isPrivate" type="checkbox" ${checked(event.isPrivate)} />
            Evento privato
          </label>
        </div>

        <div class="org-event-field" data-private-code-field>
          <label for="accessCode">Codice evento privato</label>
          <input id="accessCode" name="accessCode" type="text" value="${event.accessCode || ""}" />
          <button type="button" data-action="generate-access-code">Genera codice</button>
        </div>
      </section>

      <section class="org-event-box">
        <div class="org-event-field">
          <label>
            <input name="isFree" type="checkbox" ${checked(event.isFree)} />
            Evento gratuito
          </label>
        </div>

        <div class="org-event-field">
          <label for="price">Prezzo</label>
          <input id="price" name="price" type="number" min="0" step="0.01" value="${event.price || ""}" />
        </div>

        <div class="org-event-field">
          <label for="currency">Valuta</label>
          <select id="currency" name="currency">
            <option value="EUR" ${selected(event.currency, "EUR")}>EUR</option>
            <option value="USD" ${selected(event.currency, "USD")}>USD</option>
          </select>
        </div>
      </section>

      <div class="org-event-actions">
        <button class="primary" type="submit" ${state.saving ? "disabled" : ""}>
          ${state.saving ? "Salvataggio..." : "Salva evento"}
        </button>
        <a href="/pages/organizer-events-v2.html">Torna agli eventi</a>
      </div>
    </form>
  `;
}
