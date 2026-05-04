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

    if (action !== "delete-event") return;

    const eventId = target.dataset.eventId;

    try {
      const deleted = await handleDeleteEvent(eventId);

      if (deleted) {
        await loadEvents();
      }
    } catch (error) {
      console.error("[OrganizerEvents] delete failed", error);
      alert("Errore durante l’eliminazione dell’evento.");
    }
  });
}

export async function initEventsPage() {
  bindEvents();
  await loadEvents();
}
