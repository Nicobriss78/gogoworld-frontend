import { organizerEventDetailState } from "./organizer-event-detail-state.js";
import { renderEventDetail } from "./organizer-event-detail-renderer.js";
import { fetchEventById } from "./organizer-event-detail-api.js";
import { requireOrganizerAccess, getCurrentUser } from "../shared/user-identity.js";

const root = document.getElementById("org-event-detail-root");

init();

async function init() {
  try {
    await requireOrganizerAccess();

    const user = await getCurrentUser();
    document.getElementById("org-user").textContent = `Ciao, ${user.username}`;

    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("id");

    if (!eventId) {
      throw new Error("Evento non valido");
    }

    const data = await fetchEventById(eventId);

    organizerEventDetailState.event = data.event || data;
    organizerEventDetailState.loading = false;

    renderEventDetail(root, organizerEventDetailState);

    bindActions(eventId);

  } catch (err) {
    organizerEventDetailState.loading = false;
    organizerEventDetailState.error = err.message;
    renderEventDetail(root, organizerEventDetailState);
  }
}

function bindActions(eventId) {
  const editBtn = document.getElementById("edit-btn");

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      window.location.href = `/pages/organizer-event-form-v2.html?id=${eventId}`;
    });
  }
}
