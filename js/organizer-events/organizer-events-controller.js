import { fetchOrganizerEvents } from "./organizer-events-api.js?v=4";
import { renderEventsPage, renderEventsList } from "./organizer-events-renderer.js?v=4";
import { eventsState } from "./organizer-events-state.js?v=4";
import { handleDeleteEvent } from "./organizer-events-actions.js?v=4";

async function loadEvents() {
  eventsState.loading = true;
  eventsState.error = null;

  renderEventsPage(eventsState);

  try {
    eventsState.events = await fetchOrganizerEvents();
  } catch (error) {
    console.error("[OrganizerEvents] load failed", error);
    eventsState.error = error.message || "Errore sconosciuto";
  } finally {
    eventsState.loading = false;
    renderEventsPage(eventsState);
  }
}

function getEventIdFromButton(button) {
  return String(button?.dataset?.eventId || "").trim();
}

function bindEvents() {
  document.addEventListener("input", (event) => {
    const target = event.target;
    const key = target?.dataset?.eventsFilter;

    if (!key) return;

    eventsState.filters[key] = target.value;
    renderEventsList(eventsState);
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    const key = target?.dataset?.eventsFilter;

    if (!key) return;

    eventsState.filters[key] = target.value;
    renderEventsList(eventsState);
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;
    const action = target?.dataset?.action;

    if (!action) return;

    if (action === "request-delete-event") {
      const eventId = getEventIdFromButton(target);
      if (!eventId) return;

      eventsState.confirmDeleteId = eventId;
      eventsState.actionError = null;
      eventsState.actionMessage = null;
      renderEventsList(eventsState);
      return;
    }

    if (action === "cancel-delete-event") {
      eventsState.confirmDeleteId = null;
      eventsState.actionError = null;
      renderEventsList(eventsState);
      return;
    }

    if (action !== "confirm-delete-event") return;

    const eventId = getEventIdFromButton(target);
    if (!eventId || eventsState.deletingId) return;

    eventsState.deletingId = eventId;
    eventsState.actionError = null;
    eventsState.actionMessage = null;
    renderEventsList(eventsState);

    try {
      const deleted = await handleDeleteEvent(eventId);

      if (deleted) {
        eventsState.confirmDeleteId = null;
        eventsState.actionMessage = "Evento eliminato correttamente.";
        await loadEvents();
      }
    } catch (error) {
      console.error("[OrganizerEvents] delete failed", error);
      eventsState.actionError = error.message || "Errore durante l’eliminazione dell’evento.";
      renderEventsPage(eventsState);
    } finally {
      eventsState.deletingId = null;
      renderEventsList(eventsState);
    }
  });
}

export async function initEventsPage() {
  bindEvents();
  await loadEvents();
}
