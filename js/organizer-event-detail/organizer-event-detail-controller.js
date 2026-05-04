import { fetchEventById } from "./organizer-event-detail-api.js?v=6";
import { renderEventDetail } from "./organizer-event-detail-renderer.js?v=6";
import { organizerEventDetailState } from "./organizer-event-detail-state.js?v=6";

function getEventIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

export async function initEventDetail() {
  const eventId = getEventIdFromUrl();

  organizerEventDetailState.loading = true;
  organizerEventDetailState.error = null;
  organizerEventDetailState.event = null;

  renderEventDetail(organizerEventDetailState);

  if (!eventId) {
    organizerEventDetailState.loading = false;
    organizerEventDetailState.error = "ID evento mancante.";
    renderEventDetail(organizerEventDetailState);
    return;
  }

  try {
    const payload = await fetchEventById(eventId);
    organizerEventDetailState.event = payload?.event || payload;
  } catch (error) {
    console.error("[OrganizerEventDetail] load failed", error);
    organizerEventDetailState.error = error.message || "Errore caricamento evento.";
  } finally {
    organizerEventDetailState.loading = false;
    renderEventDetail(organizerEventDetailState);
  }
}
