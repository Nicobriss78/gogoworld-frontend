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

function getEventIdFromUrl() {
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

function mapBackendEventToForm(event) {
  return {
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    type: event.type || "",
    venueName: event.venueName || "",
    city: event.city || "",
    region: event.region || "",
    country: event.country || "Italia",
    dateStart: toLocalInputValue(event.dateStart),
    dateEnd: toLocalInputValue(event.dateEnd),
    visibility: event.visibility || "public",
    isPrivate: Boolean(event.isPrivate || event.visibility === "private"),
    accessCode: event.accessCode || "",
    isFree: event.isFree !== false,
    price: event.price ?? "",
    currency: event.currency || "EUR",
  };
}

function collectFormData(form) {
  const data = new FormData(form);

  return {
    title: String(data.get("title") || "").trim(),
    description: String(data.get("description") || "").trim(),
    category: String(data.get("category") || "").trim(),
    type: String(data.get("type") || "").trim(),
    venueName: String(data.get("venueName") || "").trim(),
    city: String(data.get("city") || "").trim(),
    region: String(data.get("region") || "").trim(),
    country: String(data.get("country") || "Italia").trim(),
    dateStart: String(data.get("dateStart") || ""),
    dateEnd: String(data.get("dateEnd") || ""),
    isPrivate: Boolean(data.get("isPrivate")),
    accessCode: String(data.get("accessCode") || "").trim(),
    isFree: Boolean(data.get("isFree")),
    price: String(data.get("price") || ""),
    currency: String(data.get("currency") || "EUR"),
  };
}

function buildPayload(event) {
  const normalized = normalizePrivacy(event);

  return {
    title: normalized.title,
    description: normalized.description,
    category: normalized.category || "generale",
    type: normalized.type || "evento",
    venueName: normalized.venueName,
    city: normalized.city,
    region: normalized.region,
    dateStart: new Date(normalized.dateStart).toISOString(),
    dateEnd: new Date(normalized.dateEnd).toISOString(),
    visibility: normalized.visibility,
    isPrivate: normalized.isPrivate,
    accessCode: normalized.accessCode || undefined,
    isFree: normalized.isFree,
    price: normalized.isFree ? 0 : Number(normalized.price),
    currency: normalized.currency || "EUR",
  };
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

    if (target.name === "isPrivate" && target.checked) {
      const codeInput = form.elements.accessCode;

      if (codeInput && !codeInput.value.trim()) {
        codeInput.value = generateAccessCode();
      }
    }
  });

  document.addEventListener("click", (domEvent) => {
    const target = domEvent.target;

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
