import {
  createOrganizerEvent,
  fetchEventById,
  updateOrganizerEvent,
} from "./organizer-event-form-api.js?v=5";
import { renderEventForm } from "./organizer-event-form-renderer.js?v=5";
import { eventFormState } from "./organizer-event-form-state.js?v=5";
import { suggestDateEnd, toDateTimeLocalValue } from "./organizer-event-duration.js?v=5";
import { generateAccessCode, normalizePrivacy } from "./organizer-event-privacy.js?v=5";
import { validateEventForm } from "./organizer-event-form-validation.js?v=5";
import { getSubcategoryOptions } from "./event-categories.js?v=5";
import {
  reverseEventCoordinates,
  searchEventCoordinates,
} from "./organizer-event-form-geocode-api.js?v=5";function getEventIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function toLocalInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toDateTimeLocalValue(date);
}

function serializeListForInput(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(" | ");
  }

  return String(value || "");
}

function splitPipeList(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptionalNumber(value) {
  const raw = String(value || "").trim();

  if (!raw) return undefined;

  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}
function updateSubcategoryOptions(form) {
  const categorySelect = form.querySelector('[name="category"]');
  const subcategorySelect = form.querySelector('[name="subcategory"]');

  if (!categorySelect || !subcategorySelect) return;

  const options = getSubcategoryOptions(categorySelect.value);

  subcategorySelect.innerHTML = `
    <option value="">Seleziona sottocategoria</option>
    ${options
      .map(
        (option) => `
          <option value="${option}">
            ${option}
          </option>
        `
      )
      .join("")}
  `;
}
function mapBackendEventToForm(event) {
  return {
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    subcategory: event.subcategory || "",
    type: event.type || "",
    language: event.language || "it",
    target: event.target || "tutti",
    venueName: event.venueName || "",
    street: event.street || "",
    streetNumber: event.streetNumber || "",
    postalCode: event.postalCode || "",
    city: event.city || "",
    province: event.province || "",
    region: event.region || "",
    country: event.country || "IT",
    lat: event.lat ?? "",
    lon: event.lon ?? "",
    dateStart: toLocalInputValue(event.dateStart),
    dateEnd: toLocalInputValue(event.dateEnd),
    visibility: event.visibility || "public",
    isPrivate: Boolean(event.isPrivate || event.visibility === "private"),
    accessCode: event.accessCode || "",
    isFree: event.isFree !== false,
    price: event.price ?? "",
    currency: event.currency || "EUR",
    tags: serializeListForInput(event.tags),
    images: serializeListForInput(event.images),
    coverImage: event.coverImage || "",
    timezone: event.timezone || "Europe/Rome",
  };
}

function collectFormData(form) {
  const data = new FormData(form);

  return {
    title: String(data.get("title") || "").trim(),
    description: String(data.get("description") || "").trim(),
    category: String(data.get("category") || "").trim(),
    subcategory:
  String(data.get("subcategory") || "").trim() === "Altro"
    ? String(data.get("subcategoryCustom") || "").trim()
    : String(data.get("subcategory") || "").trim(),
    type: String(data.get("type") || "").trim(),
    language: String(data.get("language") || "it").trim(),
    target: String(data.get("target") || "tutti").trim(),
    venueName: String(data.get("venueName") || "").trim(),
    street: String(data.get("street") || "").trim(),
    streetNumber: String(data.get("streetNumber") || "").trim(),
    postalCode: String(data.get("postalCode") || "").trim(),
    city: String(data.get("city") || "").trim(),
    province: String(data.get("province") || "").trim(),
    region: String(data.get("region") || "").trim(),
    country: String(data.get("country") || "IT").trim(),
    lat: String(data.get("lat") || "").trim(),
    lon: String(data.get("lon") || "").trim(),
    dateStart: String(data.get("dateStart") || ""),
    dateEnd: String(data.get("dateEnd") || ""),
    isPrivate: Boolean(data.get("isPrivate")),
    accessCode: String(data.get("accessCode") || "").trim(),
    isFree: Boolean(data.get("isFree")),
    price: String(data.get("price") || ""),
    currency: String(data.get("currency") || "EUR"),
    tags: String(data.get("tags") || "").trim(),
    images: String(data.get("images") || "").trim(),
    coverImage: String(data.get("coverImage") || "").trim(),
    timezone: String(data.get("timezone") || "Europe/Rome").trim(),
  };
}

function buildPayload(event) {
  const normalized = normalizePrivacy(event);
  const lat = normalizeOptionalNumber(normalized.lat);
  const lon = normalizeOptionalNumber(normalized.lon);

  const payload = {
    title: normalized.title,
    description: normalized.description,
    category: normalized.category || "generale",
    subcategory: normalized.subcategory,
    type: normalized.type || "evento",
    language: normalized.language || "it",
    target: normalized.target || "tutti",
    venueName: normalized.venueName,
    street: normalized.street,
    streetNumber: normalized.streetNumber,
    postalCode: normalized.postalCode,
    city: normalized.city,
    province: normalized.province,
    region: normalized.region,
    country: normalized.country || "IT",
    dateStart: new Date(normalized.dateStart).toISOString(),
    dateEnd: new Date(normalized.dateEnd).toISOString(),
    visibility: normalized.visibility,
    isPrivate: normalized.isPrivate,
    accessCode: normalized.accessCode || undefined,
    isFree: normalized.isFree,
    price: normalized.isFree ? 0 : Number(normalized.price),
    currency: normalized.currency || "EUR",
    tags: splitPipeList(normalized.tags),
    images: splitPipeList(normalized.images),
    coverImage: normalized.coverImage,
    timezone: normalized.timezone || "Europe/Rome",
  };

  if (lat !== undefined) payload.lat = lat;
  if (lon !== undefined) payload.lon = lon;

  if (payload.isFree) {
    delete payload.currency;
  }

  return payload;
}
function buildGeocodePayloadFromForm(form) {
  const data = collectFormData(form);

  return {
    venueName: data.venueName,
    street: data.street,
    streetNumber: data.streetNumber,
    postalCode: data.postalCode,
    city: data.city,
    province: data.province,
    region: data.region,
    country: data.country,
  };
}

function applyGeocodeResultToForm(form, result) {
  if (!result) return;

  if (form.elements.lat) form.elements.lat.value = result.lat ?? "";
  if (form.elements.lon) form.elements.lon.value = result.lon ?? "";

  if (result.city && form.elements.city && !form.elements.city.value.trim()) {
    form.elements.city.value = result.city;
  }

  if (result.province && form.elements.province && !form.elements.province.value.trim()) {
    form.elements.province.value = result.province;
  }

  if (result.region && form.elements.region && !form.elements.region.value.trim()) {
    form.elements.region.value = result.region;
  }

  if (result.country && form.elements.country && !form.elements.country.value.trim()) {
    form.elements.country.value = result.country;
  }

  if (result.postalCode && form.elements.postalCode && !form.elements.postalCode.value.trim()) {
    form.elements.postalCode.value = result.postalCode;
  }
}
function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non supportata dal browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Permesso posizione negato."));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new Error("Tempo scaduto durante il rilevamento posizione."));
          return;
        }

        reject(new Error("Impossibile ottenere la posizione attuale."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

async function handleUseCurrentPosition(form, button) {
  if (button.disabled) return;

  button.disabled = true;
  button.textContent = "Rilevo posizione...";

  eventFormState.error = null;
  eventFormState.success = null;
  eventFormState.geocodeResults = [];

  try {
    const coordinates = await getBrowserPosition();

    button.textContent = "Leggo indirizzo...";

    const payload = await reverseEventCoordinates(coordinates);
    const result = payload?.result || null;

    if (!result) {
      if (form.elements.lat) form.elements.lat.value = coordinates.lat;
      if (form.elements.lon) form.elements.lon.value = coordinates.lon;

      eventFormState.event = collectFormData(form);
      eventFormState.success =
        "Posizione rilevata. Indirizzo non trovato: coordinate compilate.";
      renderEventForm(eventFormState);
      return;
    }

    applyGeocodeResultToForm(form, result);

    eventFormState.event = collectFormData(form);
    eventFormState.success = "Posizione rilevata e campi compilati.";
    renderEventForm(eventFormState);
  } catch (error) {
    console.error("[OrganizerEventForm] reverse geocode failed", error);
    eventFormState.error =
      error.message || "Errore durante il rilevamento posizione.";
    renderEventForm(eventFormState);
  } finally {
    button.disabled = false;
    button.textContent = "Usa la mia posizione";
  }
}
async function handleSearchCoordinates(form, button) {
  if (button.disabled) return;

  button.disabled = true;
  button.textContent = "Ricerca coordinate...";

  eventFormState.error = null;
  eventFormState.success = null;

  try {
    const payload = buildGeocodePayloadFromForm(form);
    const result = await searchEventCoordinates(payload);
    const results = Array.isArray(result.results)
  ? result.results
  : [];

const firstResult = results[0] || null;

    if (!firstResult) {
      eventFormState.error = "Nessuna coordinata trovata per questo luogo.";
      renderEventForm(eventFormState);
      return;
    }
    if (results.length > 1) {
  eventFormState.geocodeResults = results;
  eventFormState.event = collectFormData(form);
  eventFormState.success = "Seleziona il luogo corretto.";
  renderEventForm(eventFormState);
  return;
}
    eventFormState.geocodeResults = [];
    applyGeocodeResultToForm(form, firstResult);

    eventFormState.event = collectFormData(form);
    eventFormState.success = "Coordinate trovate e compilate.";
    renderEventForm(eventFormState);
  } catch (error) {
    console.error("[OrganizerEventForm] geocode failed", error);
    eventFormState.error = error.message || "Errore durante la ricerca coordinate.";
    renderEventForm(eventFormState);
  } finally {
    button.disabled = false;
    button.textContent = "Cerca coordinate";
  }
}
async function loadEditEvent() {
  eventFormState.loading = true;
  eventFormState.error = null;
  renderEventForm(eventFormState);

  try {
    const payload = await fetchEventById(eventFormState.eventId);
    const event = payload?.event || payload;

    eventFormState.event = mapBackendEventToForm(event);
  } catch (error) {
    console.error("[OrganizerEventForm] load edit failed", error);
    eventFormState.error = error.message || "Errore caricamento evento.";
  } finally {
    eventFormState.loading = false;
    renderEventForm(eventFormState);
  }
}

function bindFormEvents() {
  document.addEventListener("input", (domEvent) => {
    const form = domEvent.target.closest("[data-org-event-form]");
    if (!form) return;

    const target = domEvent.target;

    if (target.name === "dateEnd") {
      eventFormState.dateEndTouched = true;
    }

    if (target.name === "dateStart" && !eventFormState.dateEndTouched) {
      const dateEndInput = form.elements.dateEnd;
      const suggestion = suggestDateEnd(target.value);

      if (dateEndInput && suggestion) {
        dateEndInput.value = suggestion;
      }
    }
  });

  document.addEventListener("change", (domEvent) => {
    const form = domEvent.target.closest("[data-org-event-form]");
    if (!form) return;

    const target = domEvent.target;
    if (target.name === "category") {
  updateSubcategoryOptions(form);
}
    if (target.name === "isPrivate" && target.checked) {
      const codeInput = form.elements.accessCode;

      if (codeInput && !codeInput.value.trim()) {
        codeInput.value = generateAccessCode();
      }
    }
  });

  document.addEventListener("click", (domEvent) => {
  const target = domEvent.target.closest("[data-action]");
  if (target?.dataset?.action === "select-geocode-result") {
  const index = Number(target.dataset.resultIndex);

  const result = eventFormState.geocodeResults?.[index];
  if (!result) return;

  const form = document.querySelector("[data-org-event-form]");
  if (!form) return;

  applyGeocodeResultToForm(form, result);

  eventFormState.geocodeResults = [];
  eventFormState.event = collectFormData(form);
  eventFormState.success = "Coordinate applicate.";
  renderEventForm(eventFormState);

  return;
}
  if (target?.dataset?.action === "search-coordinates") {
    const form = target.closest("[data-org-event-form]");
    if (!form) return;

    handleSearchCoordinates(form, target);
    return;
  }

  if (target?.dataset?.action !== "generate-access-code") return;

    const form = target.closest("[data-org-event-form]");
    if (!form) return;

    const codeInput = form.elements.accessCode;
    if (codeInput) {
      codeInput.value = generateAccessCode();
    }
  });

  document.addEventListener("submit", async (domEvent) => {
    const form = domEvent.target;

    if (!form.matches("[data-org-event-form]")) return;

    domEvent.preventDefault();

    const formEvent = collectFormData(form);
    eventFormState.event = formEvent;

    const errors = validateEventForm(formEvent);

    if (errors.length) {
      eventFormState.error = errors.join(" ");
      eventFormState.success = null;
      renderEventForm(eventFormState);
      return;
    }

    eventFormState.saving = true;
    eventFormState.error = null;
    eventFormState.success = null;
    renderEventForm(eventFormState);

    try {
      const payload = buildPayload(formEvent);

      if (eventFormState.mode === "edit") {
        await updateOrganizerEvent(eventFormState.eventId, payload);
        eventFormState.success = "Evento aggiornato correttamente.";
      } else {
        await createOrganizerEvent(payload);
        eventFormState.success = "Evento creato correttamente.";
      }
    } catch (error) {
      console.error("[OrganizerEventForm] save failed", error);
      eventFormState.error = error.message || "Errore durante il salvataggio.";
    } finally {
      eventFormState.saving = false;
      renderEventForm(eventFormState);
    }
  });
}

export async function initEventForm() {
  const path = window.location.pathname;
  const isEdit = path.includes("organizer-event-edit-v2");

  eventFormState.mode = isEdit ? "edit" : "create";
  eventFormState.eventId = isEdit ? getEventIdFromUrl() : null;

  bindFormEvents();

  if (isEdit) {
    if (!eventFormState.eventId) {
      eventFormState.error = "ID evento mancante.";
      renderEventForm(eventFormState);
      return;
    }

    await loadEditEvent();
    return;
  }

  renderEventForm(eventFormState);
}
