import { fetchOrganizerMapSummary } from "./organizer-map-api.js?v=1";
import { renderOrganizerMap } from "./organizer-map-renderer.js?v=1";
import { organizerMapState } from "./organizer-map-state.js?v=1";

async function loadOrganizerMap() {
  organizerMapState.loading = true;
  organizerMapState.error = "";

  renderOrganizerMap(organizerMapState);

  try {
    organizerMapState.data = await fetchOrganizerMapSummary();
  } catch (error) {
    console.error("[OrganizerMap] load failed", error);
    organizerMapState.error = "Errore nel caricamento della Mappa Organizer.";
  } finally {
    organizerMapState.loading = false;
    renderOrganizerMap(organizerMapState);
  }
}

function initOrganizerMap() {
  const root = document.querySelector("[data-org-map-root]");
  if (!root) return;

  loadOrganizerMap();
}

document.addEventListener("DOMContentLoaded", initOrganizerMap);
