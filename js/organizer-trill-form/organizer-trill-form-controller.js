import {
  createTrillDraft,
  fetchOrganizerEvent,
} from "./organizer-trill-form-api.js";
import { renderOrganizerTrillForm } from "./organizer-trill-form-renderer.js";
import { organizerTrillFormState } from "./organizer-trill-form-state.js";

function getEventIdFromUrl() {
  return new URLSearchParams(window.location.search).get("eventId");
}

function normalizeEventPayload(payload) {
  return payload?.event || payload?.data?.event || payload?.data || null;
}

function mapTrillError(error) {
  const message = String(error?.message || "");

  if (message.includes("EVENT_OUTSIDE_TRILL_WINDOW")) {
    return "Il trillo può essere creato solo nelle 2 ore prima dell’inizio o durante l’evento.";
  }

  if (message.includes("EVENT_NOT_APPROVED")) {
    return "Puoi creare trilli solo per eventi approvati.";
  }

  if (message.includes("DRAFT_ALREADY_EXISTS")) {
    return "Esiste già una bozza trillo per questo evento. Vai nella lista Trilli per inviarla.";
  }

  if (message.includes("INVALID_MESSAGE")) {
    return "Messaggio non valido: usa da 4 a 240 caratteri.";
  }

  if (message.includes("INVALID_RADIUS")) {
    return "Raggio non valido per questo tipo di trillo.";
  }

  return "Errore durante la creazione del trillo.";
}

async function loadEvent() {
  organizerTrillFormState.loading = true;
  organizerTrillFormState.error = null;
  renderOrganizerTrillForm(organizerTrillFormState);

  try {
    const payload = await fetchOrganizerEvent(organizerTrillFormState.eventId);
    organizerTrillFormState.event = normalizeEventPayload(payload);
  } catch (error) {
    console.error("[OrganizerTrillForm] event load failed", error);
    organizerTrillFormState.error = "Errore caricamento evento.";
  } finally {
    organizerTrillFormState.loading = false;
    renderOrganizerTrillForm(organizerTrillFormState);
  }
}

function bindForm() {
  document.addEventListener("submit", async (event) => {
    const form = event.target;

    if (!form.matches("[data-org-trill-form]")) return;

    event.preventDefault();

    if (organizerTrillFormState.saving) return;

    const formData = new FormData(form);

    const payload = {
      eventId: organizerTrillFormState.eventId,
      type: "base",
      message: String(formData.get("message") || "").trim(),
      targetingMode: String(formData.get("targetingMode") || "nearby"),
      radiusMeters: Number(formData.get("radiusMeters") || 1000),
    };

    organizerTrillFormState.saving = true;
    organizerTrillFormState.error = null;
    organizerTrillFormState.success = null;
    renderOrganizerTrillForm(organizerTrillFormState);

    try {
      await createTrillDraft(payload);
      organizerTrillFormState.success =
        "Bozza trillo creata. Ora puoi inviarla dalla lista Trilli.";
      renderOrganizerTrillForm(organizerTrillFormState);

      window.setTimeout(() => {
        window.location.href = "/pages/organizer-trills-v2.html";
      }, 900);
    } catch (error) {
      console.error("[OrganizerTrillForm] create failed", error);
      organizerTrillFormState.error = mapTrillError(error);
      renderOrganizerTrillForm(organizerTrillFormState);
    } finally {
      organizerTrillFormState.saving = false;
      renderOrganizerTrillForm(organizerTrillFormState);
    }
  });
}

export async function initOrganizerTrillForm() {
  organizerTrillFormState.eventId = getEventIdFromUrl();

  if (!organizerTrillFormState.eventId) {
    organizerTrillFormState.loading = false;
    organizerTrillFormState.error = "ID evento mancante.";
    renderOrganizerTrillForm(organizerTrillFormState);
    return;
  }

  bindForm();
  await loadEvent();
}
