import { fetchOrganizerCommunicationsSummary } from "./organizer-communications-api.js?v=1";
import { renderOrganizerCommunications } from "./organizer-communications-renderer.js?v=1";
import { communicationsState } from "./organizer-communications-state.js?v=1";

async function loadCommunications() {
  communicationsState.loading = true;
  communicationsState.error = "";

  renderOrganizerCommunications(communicationsState);

  try {
    communicationsState.summary = await fetchOrganizerCommunicationsSummary();
  } catch (error) {
    console.error("[OrganizerCommunications] load failed", error);
    communicationsState.error = "Errore nel caricamento delle comunicazioni.";
  } finally {
    communicationsState.loading = false;
    renderOrganizerCommunications(communicationsState);
  }
}

function bindActions() {
  document.addEventListener("click", (event) => {
    const openNotifications = event.target.closest("[data-org-communications-open-notifications]");
    if (!openNotifications) return;

    event.preventDefault();

    window.dispatchEvent(new CustomEvent("organizer:toggle-notifications"));
  });
}

function initOrganizerCommunications() {
  const root = document.querySelector("[data-org-communications-root]");
  if (!root) return;

  bindActions();
  loadCommunications();
}

document.addEventListener("DOMContentLoaded", initOrganizerCommunications);
