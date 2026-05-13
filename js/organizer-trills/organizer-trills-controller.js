import { fetchMyTrills, sendTrill } from "./organizer-trills-api.js?v=8";
import { renderOrganizerTrills } from "./organizer-trills-renderer.js?v=8";
import { organizerTrillsState } from "./organizer-trills-state.js?v=8";
function applyTrillsFilter() {
  if (organizerTrillsState.activeFilter === "draft") {
    organizerTrillsState.trills = organizerTrillsState.allTrills.filter(
      (trill) => String(trill?.status || "").toLowerCase() === "draft"
    );
    return;
  }

  organizerTrillsState.trills = organizerTrillsState.allTrills;
}

function applyInitialFilterFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("from");
  const filter = params.get("filter");

  if ((source === "dashboard" || source === "trill-create") && filter === "draft") {
  organizerTrillsState.sourceLabel =
    source === "dashboard"
      ? "Filtro aperto dalla Dashboard"
      : "Bozze trillo";
  organizerTrillsState.activeFilter = "draft";
}
}

function updateUrlToCleanTrills() {
  window.history.replaceState({}, "", "/pages/organizer-trills-v2.html");
}
async function load() {
  organizerTrillsState.loading = true;
  organizerTrillsState.error = null;
  renderOrganizerTrills(organizerTrillsState);

  try {
    const data = await fetchMyTrills();
organizerTrillsState.allTrills = data?.trills || [];
applyTrillsFilter();
  } catch (err) {
    organizerTrillsState.error = err.message;
  } finally {
    organizerTrillsState.loading = false;
    renderOrganizerTrills(organizerTrillsState);
  }
}

function getTrillIdFromButton(btn) {
  return String(btn?.dataset?.id || "").trim();
}

function bind() {
  document.addEventListener("click", async (e) => {
    const clearFilterBtn = e.target.closest("[data-action='clear-trills-filter']");
if (clearFilterBtn) {
  organizerTrillsState.sourceLabel = "";
  organizerTrillsState.activeFilter = "";
  updateUrlToCleanTrills();
  applyTrillsFilter();
  renderOrganizerTrills(organizerTrillsState);
  return;
}
    const requestBtn = e.target.closest("[data-action='request-send']");
    if (requestBtn) {
      const id = getTrillIdFromButton(requestBtn);
      if (!id) return;

      organizerTrillsState.confirmSendId = id;
      organizerTrillsState.actionError = null;
      organizerTrillsState.actionMessage = null;
      renderOrganizerTrills(organizerTrillsState);
      return;
    }

    const cancelBtn = e.target.closest("[data-action='cancel-send']");
    if (cancelBtn) {
      organizerTrillsState.confirmSendId = null;
      organizerTrillsState.actionError = null;
      renderOrganizerTrills(organizerTrillsState);
      return;
    }

    const confirmBtn = e.target.closest("[data-action='confirm-send']");
    if (!confirmBtn) return;

    const id = getTrillIdFromButton(confirmBtn);
    if (!id || organizerTrillsState.sendingId) return;

    organizerTrillsState.sendingId = id;
    organizerTrillsState.actionError = null;
    organizerTrillsState.actionMessage = null;
    renderOrganizerTrills(organizerTrillsState);

    try {
      await sendTrill(id);

      organizerTrillsState.confirmSendId = null;
      organizerTrillsState.actionMessage = "Trillo inviato correttamente.";
      await load();
    } catch (err) {
      organizerTrillsState.actionError = err.message || "Errore durante l’invio del trillo.";
    } finally {
      organizerTrillsState.sendingId = null;
      renderOrganizerTrills(organizerTrillsState);
    }
  });
}

export async function initOrganizerTrills() {
  applyInitialFilterFromUrl();
bind();
await load();
}
