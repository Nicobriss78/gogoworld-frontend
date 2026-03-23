import { createMappaState } from "/js/mappa/mappa-state.js";
import { createMappaApi } from "/js/mappa/mappa-api.js";
import { createMappaRenderer } from "/js/mappa/mappa-renderer.js";
import { createMappaMap } from "/js/mappa/mappa-map.js";
import { createMappaChat } from "/js/mappa/mappa-chat.js";
import { createMappaDrawer } from "/js/mappa/mappa-drawer.js";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const state = createMappaState();
  const api = createMappaApi();
  const renderer = createMappaRenderer();
  const elements = getDomElements();

  if (!elements.mapEl) {
    return;
  }

  const drawer = createMappaDrawer({
    overlayEl: elements.drawerOverlay,
    drawerEl: elements.drawer,
    closeBtnEl: elements.drawerClose,
    onClose: () => {
      state.setDrawerOpen(false);
    }
  });

  const map = createMappaMap({
    mapElementId: "mappaMap",
    onSelectEvent: handleMapEventSelect
  });

  const chat = createMappaChat({
    api,
    renderer,
    state,
    elements: {
      chatHeader: elements.chatHeader,
      chatNotice: elements.chatNotice,
      chatMessages: elements.chatMessages,
      chatInput: elements.chatInput,
      sendBtnEl: elements.chatSend,
      infoBtn: elements.infoBtn
    }
  });

 bindUi();
  await hydrateTopbar();
  drawer.mount();
  map.mount();
  chat.mount();
  chat.showIdle();

  await loadEvents();
  await handleReturnContext();

  /* ===============================
     DOM
     =============================== */

  function getSelectedEvent() {
    return state.getState().selectedEvent;
  }

  function bindUi() {
    elements.infoBtn?.addEventListener("click", handleOpenDetail);
    elements.drawerContent?.addEventListener("click", handleDrawerActions);
  }

  function unbindUi() {
    elements.infoBtn?.removeEventListener("click", handleOpenDetail);
    elements.drawerContent?.removeEventListener("click", handleDrawerActions);
  }

  function handleGlobalClick(event) {
    const action = event.target?.closest?.("[data-action]")?.dataset?.action;
    if (!action) return;

    if (action === "close-detail") {
      handleCloseDetail();
      return;
    }

    if (action === "open-full-detail") {
      const selectedEvent = getSelectedEvent();
      if (!selectedEvent?.id) return;

      handleOpenFullDetail(selectedEvent.id);
    }
  }

  /* ===============================
     TOPBAR
     =============================== */

  async function hydrateTopbar() {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;

      const data = await res.json();
      const user = data?.user || data || {};

      if (elements.userName) {
        elements.userName.textContent = user.name || user.username || "Utente";
      }

      if (elements.userStatus) {
        elements.userStatus.textContent = user.role || "Partecipante";
      }
    } catch {
      // silenzioso
    }
  }

  /* ===============================
     LOAD EVENTI PUBBLICI
     =============================== */

  async function loadEvents() {
    try {
      state.setMapStatus({
        mapLoading: true,
        mapError: ""
      });

      const events = await api.fetchPublicMapEvents();

      state.setEvents(events);
      map.setEvents(events);

      state.setMapStatus({
        mapLoading: false,
        mapReady: true
      });
    } catch {
      state.setMapStatus({
        mapLoading: false,
        mapError: "LOAD_EVENTS_ERROR"
      });

      elements.chatNotice.innerHTML = renderer.renderChatError(
        "Errore caricamento eventi mappa"
      );
    }
  }

  /* ===============================
     SELEZIONE EVENTO DA MAPPA
     =============================== */

  async function handleMapEventSelect(event) {
    if (!event?.id) return;

    state.setSelectedEvent(event);

    if (state.getState().drawerOpen) {
      renderDetailCard(event);
    }

    await chat.openForEvent(event);
  }

  /* ===============================
     DRAWER
     =============================== */

  function renderDetailCard(event) {
    elements.drawerContent.innerHTML = renderer.renderSelectedEventCard(event);
  }

  function handleOpenDetail() {
    const selectedEvent = getSelectedEvent();
    if (!selectedEvent) return;

    renderDetailCard(selectedEvent);
    drawer.open();
    state.setDrawerOpen(true);
  }

  function handleCloseDetail() {
    drawer.close();
    state.setDrawerOpen(false);
  }

  /* ===============================
     DETTAGLIO COMPLETO
     =============================== */

  function handleOpenFullDetail(eventId) {
    const drawerWasOpen = state.getState().drawerOpen;

    saveReturnContext({
      returnEventId: eventId,
      returnDrawerOpen: drawerWasOpen
    });

    state.setReturnContext({
      returnEventId: eventId,
      returnDrawerOpen: drawerWasOpen
    });

    window.location.href = `/pages/evento.html?id=${encodeURIComponent(eventId)}`;
  }

  /* ===============================
     RETURN CONTEXT
     =============================== */

  async function handleReturnContext() {
    const stored = readReturnContext();
    if (!stored?.returnEventId) return;
    if (stored.fromView !== "map-v2") return;

    state.setReturnContext({
      returnEventId: stored.returnEventId,
      returnDrawerOpen: Boolean(stored.returnDrawerOpen)
    });

    let event =
      state.getState().eventsById.get(stored.returnEventId) || null;

    if (!event) {
      event = await api.fetchEventDetail(stored.returnEventId);
    }

    if (!event?.id) {
      clearReturnContextStorage();
      state.clearReturnContext();
      return;
    }

    state.setSelectedEvent(event);
    map.focusEvent(event.id);
    await chat.openForEvent(event);

    if (stored.returnDrawerOpen) {
      renderDetailCard(event);
      drawer.open();
      state.setDrawerOpen(true);
    }

    clearReturnContextStorage();
    state.clearReturnContext();
  }

  function saveReturnContext({ returnEventId, returnDrawerOpen }) {
    try {
      sessionStorage.setItem(
        "gw:mappa-v2:return-context",
        JSON.stringify({
          fromView: "map-v2",
          returnTo: "/pages/mappa-v2.html",
          returnEventId,
          returnDrawerOpen: Boolean(returnDrawerOpen)
        })
      );
    } catch {
      // silenzioso
    }
  }

  function readReturnContext() {
    try {
      const raw = sessionStorage.getItem("gw:mappa-v2:return-context");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearReturnContextStorage() {
    try {
      sessionStorage.removeItem("gw:mappa-v2:return-context");
    } catch {
      // silenzioso
    }
  }

  /* ===============================
     CLEANUP FUTURO (SE SERVE)
     =============================== */

  window.addEventListener("beforeunload", () => {
    unbindUi();
    chat.destroy();
    drawer.destroy();
    map.destroy();
  });
}

function getDomElements() {
  return {
    mapEl: document.getElementById("mappaMap"),

    userName: document.getElementById("gwUserName"),
    userStatus: document.getElementById("gwUserStatus"),

    drawerOverlay: document.getElementById("mappaDetailOverlay"),
    drawer: document.getElementById("mappaDetailDrawer"),
    drawerClose: document.getElementById("mappaDetailClose"),
    drawerContent: document.getElementById("mappaDetailContent"),

    chatHeader: document.getElementById("mappaChatHeader"),
    chatNotice: document.getElementById("mappaChatNotice"),
    chatMessages: document.getElementById("mappaChatMessages"),
    chatInput: document.getElementById("mappaChatInput"),
    chatSend: document.getElementById("mappaChatSend"),

    infoBtn: document.getElementById("mappaChatInfoBtn")
  };
      }
