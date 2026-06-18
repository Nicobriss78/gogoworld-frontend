import { fetchOrganizerEvents } from "./organizer-events-api.js?v=4";
import { renderEventsPage, renderEventsList } from "./organizer-events-renderer.js?v=8";
import { eventsState } from "./organizer-events-state.js?v=8";
import { handleDeleteEvent } from "./organizer-events-actions.js?v=4";

function resetFilters() {
  eventsState.filters.query = "";
  eventsState.filters.approvalStatus = "all";
  eventsState.filters.privacy = "all";
  eventsState.filters.temporal = "all";
  eventsState.filters.special = "all";
  eventsState.filters.sort = "default";
}

function applyInitialFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("from");
  const filter = params.get("filter");
  const sort = params.get("sort");

  if (source === "dashboard" && filter) {
    eventsState.sourceLabel = "Filtro aperto dalla Dashboard";
  }

  if (source === "dashboard" && sort === "participants") {
  eventsState.sourceLabel = "Ordinamento aperto dalla Dashboard";
  eventsState.filters.sort = "participants";
}

if (!filter) return;

  if (["approved", "pending", "rejected", "blocked"].includes(filter)) {
    eventsState.filters.approvalStatus = filter;
    eventsState.filters.special = "all";
    return;
  }

  if (filter === "no-participants") {
    eventsState.filters.approvalStatus = "approved";
    eventsState.filters.temporal = "upcoming";
    eventsState.filters.special = "no-participants";
  }
  
  if (filter === "needs-correction") {
  eventsState.filters.approvalStatus = "all";
  eventsState.filters.temporal = "all";
  eventsState.filters.special = "needs-correction";
  }
}

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

function updateUrlToCleanEvents() {
  window.history.replaceState({}, "", "/pages/organizer-events-v2.html");
}

function bindEvents() {
  document.addEventListener("input", (event) => {
    const target = event.target;
    const key = target?.dataset?.eventsFilter;

    if (!key) return;

    eventsState.filters[key] = target.value;
    eventsState.sourceLabel = "";
    updateUrlToCleanEvents();
    renderEventsPage(eventsState);
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    const key = target?.dataset?.eventsFilter;

    if (!key) return;

    eventsState.filters[key] = target.value;
    eventsState.sourceLabel = "";
    updateUrlToCleanEvents();
    renderEventsPage(eventsState);
  });

  document.addEventListener("click", async (event) => {
    const target = event.target?.closest?.("[data-action]");
    const action = target?.dataset?.action;

    if (!action) return;

    if (action === "clear-dashboard-filter" || action === "reset-events-filters") {
      eventsState.sourceLabel = "";
      resetFilters();
      updateUrlToCleanEvents();
      renderEventsPage(eventsState);
      return;
    }

    if (action === "apply-events-filter") {
      const key = target.dataset.filterKey;
      const value = target.dataset.filterValue;

      if (!key || value === undefined) return;

      resetFilters();

      if (key === "approvalStatus") {
        eventsState.filters.approvalStatus = value;
      }

      if (key === "privacy") {
        eventsState.filters.privacy = value;
      }

      if (key === "special") {
        eventsState.filters.special = value;

        if (value === "no-participants") {
          eventsState.filters.approvalStatus = "approved";
          eventsState.filters.temporal = "upcoming";
        }
      }

      eventsState.sourceLabel = "";
      updateUrlToCleanEvents();
      renderEventsPage(eventsState);
      return;
    }

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
  applyInitialFiltersFromUrl();
  bindEvents();
  await loadEvents();
}
