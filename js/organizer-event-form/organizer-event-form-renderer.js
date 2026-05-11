import {
  getCategoryOptions,
  getSubcategoryOptions,
} from "./event-categories.js";
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
function getEventIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function getEventDetailBackHref() {
  const eventId = getEventIdFromUrl();
  const rootReturnTo = getRootReturnTo();

  if (!eventId) return getBackHref();

  const params = new URLSearchParams();
  params.set("id", eventId);

  if (rootReturnTo) {
    params.set("rootReturnTo", rootReturnTo);
  }

  return `/pages/organizer-event-detail-v2.html?${params.toString()}`;
}

function getEventFormBackHref() {
  const isEdit = window.location.pathname.includes("organizer-event-edit-v2");
  return isEdit ? getEventDetailBackHref() : getBackHref();
}

function getEventFormBackLabel() {
  const isEdit = window.location.pathname.includes("organizer-event-edit-v2");
  return isEdit ? "Torna al dettaglio evento" : getBackLabel();
}
function checked(value) {
  return value ? "checked" : "";
}

function selected(current, value) {
  return current === value ? "selected" : "";
}

function getModeTitle(mode) {
  return mode === "edit" ? "Modifica evento" : "Crea evento";
}
function renderOptions(options, currentValue) {
  return options
    .map((option) => {
      const value = String(option);
      return `
        <option value="${escapeHtml(value)}" ${selected(currentValue, value)}>
          ${escapeHtml(value)}
        </option>
      `;
    })
    .join("");
}
export function renderEventForm(state) {
  const root = document.querySelector("[data-org-event-form-root]");
  if (!root) return;

  const title = escapeHtml(getModeTitle(state.mode));

  if (state.loading) {
    root.innerHTML = `
      <h1>${title}</h1>
      <p>Caricamento...</p>
    `;
    return;
  }

  const event = state.event || {};
const categoryOptions = getCategoryOptions();
const subcategoryOptions = getSubcategoryOptions(event.category);
const isCustomSubcategory = Boolean(
  event.subcategory &&
  !subcategoryOptions.includes(event.subcategory)
);
  root.innerHTML = `
    <h1>${title}</h1>
    <p>Form evento V2 allineato ai campi legacy/backend attualmente stabili.</p>

    ${state.error ? `<section class="org-event-error">${escapeHtml(state.error)}</section>` : ""}
    ${state.success ? `<section class="org-event-success">${escapeHtml(state.success)}</section>` : ""}

    <form class="org-event-form" data-org-event-form>
      <section class="org-event-box">
        <h2>Informazioni base</h2>

        <div class="org-event-field">
          <label for="title">Titolo *</label>
          <input id="title" name="title" type="text" value="${escapeHtml(event.title || "")}" required />
        </div>

        <div class="org-event-field">
          <label for="description">Descrizione *</label>
          <textarea id="description" name="description" required>${escapeHtml(event.description || "")}</textarea>
        </div>
        <div class="org-event-row">
  <div class="org-event-field">
    <label for="category">Categoria *</label>
    <select id="category" name="category" required>
      <option value="">Seleziona categoria</option>
      ${renderOptions(categoryOptions, event.category)}
    </select>
  </div>

  <div class="org-event-field">
    <label for="subcategory">Sottocategoria</label>
    <select id="subcategory" name="subcategory">
      <option value="">Seleziona sottocategoria</option>
      ${renderOptions(subcategoryOptions, event.subcategory)}
    </select>
  </div>

  ${
    isCustomSubcategory
      ? `
        <div class="org-event-field">
          <label for="subcategoryCustom">Sottocategoria personalizzata</label>
          <input
            id="subcategoryCustom"
            name="subcategoryCustom"
            type="text"
            value="${escapeHtml(event.subcategory || "")}"
          />
        </div>
      `
      : ""
  }

  <div class="org-event-field">
    <label for="type">Tipo</label>
    <input id="type" name="type" type="text" value="${escapeHtml(event.type || "")}" />
  </div>
</div>
      </section>

      <section class="org-event-box">
        <h2>Visibilità, lingua e target</h2>

        <div class="org-event-row">
          <div class="org-event-field">
            <label for="language">Lingua *</label>
            <input id="language" name="language" type="text" value="${escapeHtml(event.language || "it")}" required />
          </div>

          <div class="org-event-field">
            <label for="target">Target *</label>
            <input id="target" name="target" type="text" value="${escapeHtml(event.target || "tutti")}" required />
          </div>

          <div class="org-event-field">
            <label for="timezone">Timezone</label>
            <input id="timezone" name="timezone" type="text" value="${escapeHtml(event.timezone || "Europe/Rome")}" />
          </div>
        </div>

        <div class="org-event-field">
          <label>
            <input name="isPrivate" type="checkbox" ${checked(event.isPrivate)} />
            Evento privato
          </label>
        </div>

        <div class="org-event-field" data-private-code-field>
          <label for="accessCode">Codice evento privato</label>
          <input id="accessCode" name="accessCode" type="text" value="${escapeHtml(event.accessCode || "")}" />
          <button type="button" data-action="generate-access-code">Genera codice</button>
        </div>
      </section>

      <section class="org-event-box">
        <h2>Localizzazione</h2>

        <div class="org-event-field">
          <label for="venueName">Nome luogo</label>
          <input id="venueName" name="venueName" type="text" value="${escapeHtml(event.venueName || "")}" />
        </div>

        <div class="org-event-row">
          <div class="org-event-field">
            <label for="street">Via</label>
            <input id="street" name="street" type="text" value="${escapeHtml(event.street || "")}" />
          </div>

          <div class="org-event-field">
            <label for="streetNumber">Numero civico</label>
            <input id="streetNumber" name="streetNumber" type="text" value="${escapeHtml(event.streetNumber || "")}" />
          </div>

          <div class="org-event-field">
            <label for="postalCode">CAP</label>
            <input id="postalCode" name="postalCode" type="text" value="${escapeHtml(event.postalCode || "")}" />
          </div>
        </div>

        <div class="org-event-row">
          <div class="org-event-field">
            <label for="city">Città *</label>
            <input id="city" name="city" type="text" value="${escapeHtml(event.city || "")}" required />
          </div>

          <div class="org-event-field">
            <label for="province">Provincia</label>
            <input id="province" name="province" type="text" value="${escapeHtml(event.province || "")}" />
          </div>

          <div class="org-event-field">
            <label for="region">Regione *</label>
            <input id="region" name="region" type="text" value="${escapeHtml(event.region || "")}" required />
          </div>

          <div class="org-event-field">
            <label for="country">Paese *</label>
            <input id="country" name="country" type="text" value="${escapeHtml(event.country || "IT")}" required />
          </div>
        </div>
           <div class="org-event-field">
  <div class="org-event-location-actions">
  <button type="button" data-action="search-coordinates">
    Cerca coordinate
  </button>

  <button type="button" data-action="use-current-position">
    Usa la mia posizione
  </button>
</div>
  <small>
  ${
  Array.isArray(state.geocodeResults) && state.geocodeResults.length > 1
    ? `
      <div class="org-event-geocode-results">
        <label>Seleziona il luogo corretto</label>

        <div class="org-event-geocode-results-list">
          ${state.geocodeResults
            .map(
              (result, index) => `
                <button
                  type="button"
                  class="org-event-geocode-result"
                  data-action="select-geocode-result"
                  data-result-index="${index}"
                >
                  <strong>${escapeHtml(result.label || "Luogo")}</strong>

                  <small>
                    ${escapeHtml(
                      [
                        result.city,
                        result.region,
                        result.country,
                      ]
                        .filter(Boolean)
                        .join(" • ")
                    )}
                  </small>
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    `
    : ""
  }
    Usa nome luogo, indirizzo, città, provincia, regione e paese per suggerire latitudine e longitudine.
  </small>
</div>
        <div class="org-event-row">
          <div class="org-event-field">
            <label for="lat">Latitudine</label>
            <input id="lat" name="lat" type="text" inputmode="decimal" value="${escapeHtml(event.lat ?? "")}" />
          </div>

          <div class="org-event-field">
            <label for="lon">Longitudine</label>
            <input id="lon" name="lon" type="text" inputmode="decimal" value="${escapeHtml(event.lon ?? "")}" />
          </div>
        </div>
      </section>

      <section class="org-event-box">
        <h2>Date</h2>

        <div class="org-event-field">
          <label for="dateStart">Data inizio *</label>
          <input id="dateStart" name="dateStart" type="datetime-local" value="${escapeHtml(event.dateStart || "")}" required />
        </div>

        <div class="org-event-field">
          <label for="dateEnd">Data fine * — suggerita automaticamente ma modificabile</label>
          <input id="dateEnd" name="dateEnd" type="datetime-local" value="${escapeHtml(event.dateEnd || "")}" required />
        </div>
      </section>

      <section class="org-event-box">
        <h2>Prezzo</h2>

        <div class="org-event-field">
          <label>
            <input name="isFree" type="checkbox" ${checked(event.isFree)} />
            Evento gratuito
          </label>
        </div>

        <div class="org-event-row">
          <div class="org-event-field">
            <label for="price">Prezzo</label>
            <input id="price" name="price" type="number" min="0" step="0.01" value="${escapeHtml(event.price || "")}" />
          </div>

          <div class="org-event-field">
            <label for="currency">Valuta</label>
            <select id="currency" name="currency">
              <option value="EUR" ${selected(event.currency, "EUR")}>EUR</option>
              <option value="USD" ${selected(event.currency, "USD")}>USD</option>
            </select>
          </div>
        </div>
      </section>

      <section class="org-event-box">
        <h2>Media e tag</h2>

        <div class="org-event-field">
          <label for="tags">Tag</label>
          <input id="tags" name="tags" type="text" value="${escapeHtml(event.tags || "")}" />
          <small>Separali con il simbolo |</small>
        </div>

        <div class="org-event-field">
          <label for="images">Immagini</label>
          <textarea id="images" name="images">${escapeHtml(event.images || "")}</textarea>
          <small>Inserisci URL https separati da |</small>
        </div>

        <div class="org-event-field">
          <label for="coverImage">Immagine di copertina</label>
          <input id="coverImage" name="coverImage" type="url" value="${escapeHtml(event.coverImage || "")}" />
        </div>
      </section>

      <div class="org-event-actions">
        <button class="primary" type="submit" ${state.saving ? "disabled" : ""}>
          ${state.saving ? "Salvataggio..." : "Salva evento"}
        </button>
        <a href="${escapeHtml(getEventFormBackHref())}">${escapeHtml(getEventFormBackLabel())}</a>
      </div>
    </form>
  `;
}




