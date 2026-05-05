import { fetchMyTrills, sendTrill } from "./organizer-trills-api.js";
import { renderOrganizerTrills } from "./organizer-trills-renderer.js";
import { organizerTrillsState } from "./organizer-trills-state.js";

async function load() {
  organizerTrillsState.loading = true;
  renderOrganizerTrills(organizerTrillsState);

  try {
    const data = await fetchMyTrills();
    organizerTrillsState.trills = data?.trills || [];
  } catch (err) {
    organizerTrillsState.error = err.message;
  } finally {
    organizerTrillsState.loading = false;
    renderOrganizerTrills(organizerTrillsState);
  }
}

function bind() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action='send']");
    if (!btn) return;

    const id = btn.dataset.id;

    const confirmed = confirm("Inviare questo trill?");
    if (!confirmed) return;

    try {
      await sendTrill(id);
      await load();
    } catch (err) {
      alert("Errore invio trill");
    }
  });
}

export async function initOrganizerTrills() {
  bind();
  await load();
}
