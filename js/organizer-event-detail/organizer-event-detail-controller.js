import {
  deleteOrganizerEvent,
  fetchEventById,
  openOrJoinEventRoom,
} from "./organizer-event-detail-api.js?v=6";
import { renderEventDetail } from "./organizer-event-detail-renderer.js?v=6";
import { organizerEventDetailState } from "./organizer-event-detail-state.js?v=6";

function getEventIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

async function loadEvent(eventId) {
  organizerEventDetailState.loading = true;
  organizerEventDetailState.error = null;
  organizerEventDetailState.event = null;

  renderEventDetail(organizerEventDetailState);

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

function bindEventDetailActions(eventId) {
  document.addEventListener("click", async (domEvent) => {
    const target = domEvent.target;
    const action = target?.dataset?.action;

    if (!action) return;

    if (action === "delete-event") {
      const confirmed = window.confirm("Vuoi davvero eliminare questo evento?");

      if (!confirmed) return;

      try {
        await deleteOrganizerEvent(eventId);
        window.location.href = "/pages/organizer-events-v2.html";
      } catch (error) {
        console.error("[OrganizerEventDetail] delete failed", error);
        alert("Errore durante l’eliminazione dell’evento.");
      }

      return;
    }

    if (action === "open-room") {
      try {
        const payload = await openOrJoinEventRoom(eventId);
        const roomId = payload?.room?._id || payload?.room?.id || payload?.roomId;

        if (!roomId) {
          alert("Room aperta, ma ID room non ricevuto.");
          return;
        }

        window.location.href = `/pages/messages-v2.html?roomId=${roomId}&rootReturnTo=organizer`;
      } catch (error) {
        console.error("[OrganizerEventDetail] open room failed", error);
        alert("Errore durante l’apertura della room evento.");
      }
    }
  });
}

export async function initEventDetail() {
  const eventId = getEventIdFromUrl();

  if (!eventId) {
    organizerEventDetailState.loading = false;
    organizerEventDetailState.error = "ID evento mancante.";
    renderEventDetail(organizerEventDetailState);
    return;
  }

  bindEventDetailActions(eventId);
  await loadEvent(eventId);
}
