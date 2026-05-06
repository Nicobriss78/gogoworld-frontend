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

function extractRoomId(payload) {
  return (
    payload?.data?.roomId ||
    payload?.room?._id ||
    payload?.room?.id ||
    payload?.room?.roomId ||
    payload?.roomId ||
    payload?.data?._id ||
    payload?.data?.id ||
    payload?._id ||
    payload?.id ||
    ""
  );
}

async function loadEvent(eventId) {
  organizerEventDetailState.loading = true;
  organizerEventDetailState.error = null;
  organizerEventDetailState.actionError = null;
  organizerEventDetailState.actionMessage = null;
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

    if (action === "request-delete-event") {
      organizerEventDetailState.confirmDelete = true;
      organizerEventDetailState.actionError = null;
      organizerEventDetailState.actionMessage = null;
      renderEventDetail(organizerEventDetailState);
      return;
    }

    if (action === "cancel-delete-event") {
      organizerEventDetailState.confirmDelete = false;
      organizerEventDetailState.actionError = null;
      renderEventDetail(organizerEventDetailState);
      return;
    }

    if (action === "confirm-delete-event") {
      if (organizerEventDetailState.deleting) return;

      organizerEventDetailState.deleting = true;
      organizerEventDetailState.actionError = null;
      organizerEventDetailState.actionMessage = null;
      renderEventDetail(organizerEventDetailState);

      try {
        await deleteOrganizerEvent(eventId);
        window.location.href = "/pages/organizer-events-v2.html";
      } catch (error) {
        console.error("[OrganizerEventDetail] delete failed", error);
        organizerEventDetailState.actionError = error.message || "Errore durante l’eliminazione dell’evento.";
        organizerEventDetailState.deleting = false;
        renderEventDetail(organizerEventDetailState);
      }

      return;
    }

    if (action === "open-room") {
      if (organizerEventDetailState.openingRoom) return;

      organizerEventDetailState.openingRoom = true;
      organizerEventDetailState.actionError = null;
      organizerEventDetailState.actionMessage = null;
      renderEventDetail(organizerEventDetailState);

      try {
        const payload = await openOrJoinEventRoom(eventId);
        const roomId = extractRoomId(payload);

        if (!roomId) {
          console.error("[OrganizerEventDetail] room payload without id", payload);
          organizerEventDetailState.actionError = "Room aperta, ma ID room non ricevuto.";
          organizerEventDetailState.openingRoom = false;
          renderEventDetail(organizerEventDetailState);
          return;
        }

        window.location.href = `/pages/messages-v2.html?roomId=${encodeURIComponent(roomId)}&rootReturnTo=organizer`;
      } catch (error) {
        console.error("[OrganizerEventDetail] open room failed", error);
        organizerEventDetailState.actionError = error.message || "Errore durante l’apertura della room evento.";
        organizerEventDetailState.openingRoom = false;
        renderEventDetail(organizerEventDetailState);
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
