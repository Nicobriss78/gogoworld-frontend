// frontend/js/partecipante-mappa.js
// Controller dedicato alla scheda MAPPA (UI v2)
// Estratto/derivato da partecipante.js: init mappa + chat embedded + dettaglio evento selezionato

import { apiGet } from "./api.js";
import { renderEventCard } from "./home-cards.js";
import { createParticipantMap } from "./map.js";
import { createEmbeddedEventChat } from "./map-chat.js";

/* =========================
   ANCHOR: MAPPA_ALERT_FALLBACK
   ========================= */
function showAlertFallback(message, type = "error", opts = {}) {
  // Se esiste una showAlert globale (es. da participant-shared.js), usala
  if (typeof window.showAlert === "function") {
    window.showAlert(message, type, opts);
    return;
  }

  // Fallback minimale (non rompe la pagina)
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;

  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
  }

  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}

/* =========================
   ANCHOR: MAPPA_TOPBAR
   ========================= */
async function hydrateTopbar(token) {
  try {
    const me = await apiGet("/users/me", token);
    const name =
      me?.name ||
      me?.user?.name ||
      me?.email ||
      me?.user?.email ||
      "Utente";

    const statusRaw = (me?.status || me?.user?.status || "").toString().toLowerCase();
    const statusLabel = statusRaw
      ? statusRaw[0].toUpperCase() + statusRaw.slice(1)
      : "Partecipante";

    const topName = document.getElementById("gwUserName");
    if (topName) topName.textContent = name;

    const topStatus = document.getElementById("gwUserStatus");
    if (topStatus) topStatus.textContent = statusLabel || "Partecipante";
  } catch {
    // Non blocchiamo MAPPA se /users/me fallisce
  }
}

/* =========================
   ANCHOR: MAPPA_SELECTED_EVENT
   ========================= */
function renderSelectedEventCard(ev) {
  const mapSelected = document.getElementById("mapSelectedEvent");
  if (!mapSelected) return;

  mapSelected.innerHTML = `
    <div class="gw-map-selected-wrap">
      ${renderEventCard(ev, false, { detailsVariant: "plus", showCloseDetail: true })}
    </div>
  `;
}

/* =========================
   ANCHOR: MAPPA_BOOT
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  // Topbar (nome + status)
  await hydrateTopbar(token);

  // Init mappa
  const participantMap = createParticipantMap({
    mapId: "map",
    onSelectEvent: handleMapEventSelect
  });
  participantMap.init();

  // Chat embedded
  const mapChat = createEmbeddedEventChat({
    panelId: "mapChatPanel",
    composerId: "mapChatComposer",
    inputId: "mapChatInput",
    sendId: "mapChatSend"
  });

  /* =========================
     ANCHOR: MAPPA_LOAD_EVENTS
     ========================= */
  async function loadMapEvents() {
    try {
      const res = await apiGet("/events", token);
      const events = res?.events || res?.data?.events || [];
      if (!Array.isArray(events)) {
        throw new Error("Formato eventi non valido");
      }

      participantMap.updateFromEvents(events);

      // Se stiamo tornando da evento.html e abbiamo un id, proviamo a ripristinare focus + drawer + chat
      const returnEventId = sessionStorage.getItem("returnEventId");
      if (returnEventId) {
        // 1) Focus marker (se presente tra gli eventi caricati)
        participantMap.focusOnEventId(returnEventId);

        // 2) Carica dettaglio evento (più affidabile: endpoint /events/:id)
        try {
          const detail = await apiGet(`/events/${returnEventId}`, token);
          const ev = detail?.event || detail?.data?.event;
          if (ev) {
            handleMapEventSelect(ev);
          }
        } catch {
          // se fallisce, almeno il focus marker è già stato tentato
        }

        // consumiamo l'id (così non ripete)
        sessionStorage.removeItem("returnEventId");
      }
    } catch (err) {
      showAlertFallback(err?.message || "Errore nel caricamento eventi (MAPPA)", "error", { autoHideMs: 4000 });
    }
  }

  /* =========================
     ANCHOR: MAPPA_HANDLE_SELECT
     ========================= */
  function handleMapEventSelect(ev) {
    if (!ev) return;

    // Drawer dettagli (card con + e ×)
    renderSelectedEventCard(ev);

    // Chat
    mapChat.openForEvent(ev._id, ev?.title || "Evento");

    // Mostra composer (map-chat gestisce canSend)
    const composer = document.getElementById("mapChatComposer");
    if (composer) composer.style.display = "flex";
  }

  // Carica eventi e popola marker
  await loadMapEvents();
});
