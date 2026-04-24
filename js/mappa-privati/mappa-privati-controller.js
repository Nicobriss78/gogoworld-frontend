import { createMappaState } from "/js/mappa-privati/mappa-privati-state.js";
import { createMappaApi } from "/js/mappa-privati/mappa-privati-api.js";
import { createMappaRenderer } from "/js/mappa-privati/mappa-privati-renderer.js";
import { createMappaMap } from "/js/mappa-privati/mappa-privati-map.js";
import { createMappaChat } from "/js/mappa-privati/mappa-privati-chat.js";
import { createMappaDrawer } from "/js/mappa-privati/mappa-privati-drawer.js";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const state = createMappaState();
  const api = createMappaApi();
  const renderer = createMappaRenderer();

  const elements = getDomElements();

  if (!elements.mapEl) {
    return;
  }

  let isRestoringFromReturn = false;

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
    onSelectEvent: handleMapEventSelect,
    onViewportChanged: handleViewportChanged
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
  drawer.mount();
  map.mount();
  chat.mount();
  chat.showIdle();
  const hasReturnContext = hasPendingReturnContext();

  await loadEvents({
    fitBounds: !hasReturnContext
  });

  if (hasReturnContext) {
    await handleReturnContext();
  }

  scheduleMapRefresh();

  /* ===============================
     DOM
     =============================== */

  function getSelectedEvent() {
    return state.getState().selectedEvent;
  }

  function scheduleMapRefresh() {
    window.requestAnimationFrame(() => {
      map.refreshLayout();

      window.setTimeout(() => {
        map.refreshLayout();
      }, 120);

      window.setTimeout(() => {
        map.refreshLayout();
      }, 320);
    });
  }

  function bindUi() {
    elements.infoBtn?.addEventListener("click", handleOpenEventPage);
    elements.drawerContent?.addEventListener("click", handleDrawerActions);
elements.unlockBtn?.addEventListener("click", handleUnlockPrivateEventRequest);  }

  function unbindUi() {
    elements.infoBtn?.removeEventListener("click", handleOpenEventPage);
    elements.drawerContent?.removeEventListener("click", handleDrawerActions);
elements.unlockBtn?.removeEventListener("click", handleUnlockPrivateEventRequest);  }
  function handleDrawerActions(event) {
    const action = event.target?.closest?.("[data-action]")?.dataset?.action;
    if (!action) return;

    if (action === "close-detail") {
      handleCloseDetail();
      return;
    }

    if (action === "open-full-chat") {
      const selectedEvent = getSelectedEvent();
      if (!selectedEvent?.id) return;

      handleOpenFullChat(selectedEvent.id);
      return;
    }

    if (action === "open-full-detail") {
      const selectedEvent = getSelectedEvent();
      if (!selectedEvent?.id) return;

      handleOpenFullDetail(selectedEvent.id);
    }
  }

/* ===============================
     SHELL SHARED
     Topbar / menu / notifications delegati alla shared shell
     =============================== */
  
  async function handleViewportChanged(viewport) {
  if (!viewport) return;
  if (isRestoringFromReturn) return;

  const nextCenter = {
    lat: Number(viewport.lat),
    lng: Number(viewport.lng)
  };

  if (!Number.isFinite(nextCenter.lat) || !Number.isFinite(nextCenter.lng)) {
    return;
  }

  state.setGeoState({
    mapCenter: nextCenter
  });
}
  function hasPendingReturnContext() {
    try {
      const raw = sessionStorage.getItem("gw:mappa-privati-v2:return-context");
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      return Boolean(
        parsed &&
        parsed.fromView === "map-private-v2" &&
        parsed.returnEventId
      );
    } catch {
      return false;
    }
  }
  /* ===============================
     LOAD EVENTI PUBBLICI
     =============================== */

  async function loadEvents(options = {}) {
    try {
      state.setMapStatus({
        mapLoading: true,
        mapError: ""
      });

      const events = await api.fetchPrivateMapEvents();

      const shouldFitBounds = options.fitBounds === true;

      state.setEvents(events);
      map.setEvents(events, { fitBounds: shouldFitBounds });

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

  function handleOpenEventPage() {
    const selectedEvent = getSelectedEvent();
    if (!selectedEvent?.id) return;

    handleOpenFullDetail(selectedEvent.id);
  }

  function handleCloseDetail() {
    drawer.close();
    state.setDrawerOpen(false);
  }

  /* ===============================
     DETTAGLIO COMPLETO
     =============================== */
function handleOpenFullChat(eventId) {
    if (!eventId) return;

    const params = new URLSearchParams();
    params.set("tab", "events");
    params.set("eventId", String(eventId).trim());
    params.set("rootReturnTo", "/pages/mappa-privati-v2.html");

    window.location.href = `/pages/messages-v2.html?${params.toString()}`;
}
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

  window.location.href =
    `/pages/evento-v2.html?id=${encodeURIComponent(eventId)}` +
    `&fromView=map-private-v2` +
    `&rootReturnTo=${encodeURIComponent("/pages/mappa-privati-v2.html")}` +
    `&returnEventId=${encodeURIComponent(eventId)}`;
}
async function handleUnlockPrivateEventRequest() {
    const code = window.prompt("Inserisci il codice dell'evento privato:");
    if (!code) return;

    try {
      await api.unlockPrivateEventByCode(code);

      await loadEvents({
  fitBounds: true
});

      scheduleMapRefresh();
      window.alert("Evento privato sbloccato correttamente.");
    } catch (error) {
      const status =
        Number(error?.response?.status) ||
        Number(error?.response?.statusCode) ||
        0;

      if (status === 404) {
        window.alert("Codice non valido o evento non disponibile.");
        return;
      }

      if (status === 403) {
        window.alert("Non sei autorizzato a sbloccare questo evento.");
        return;
      }

      if (status === 429) {
        window.alert("Troppi tentativi. Attendi un momento e riprova.");
        return;
      }

      window.alert("Errore durante lo sblocco dell'evento privato.");
    }
  }

  window.gwMappaPrivatiUnlockPrivateEvent = handleUnlockPrivateEventRequest;
  /* ===============================
     RETURN CONTEXT
     =============================== */

  async function handleReturnContext() {
    const stored = readReturnContext();
    if (!stored?.returnEventId) return;
    if (stored.fromView !== "map-private-v2") return;

    isRestoringFromReturn = true;

    state.setReturnContext({
      returnEventId: stored.returnEventId,
      returnDrawerOpen: Boolean(stored.returnDrawerOpen)
    });

    let event =
      state.getState().eventsById.get(stored.returnEventId) || null;

    if (!event) {
      await loadEvents({ fitBounds: false });
      event = state.getState().eventsById.get(stored.returnEventId) || null;
    }

    if (!event) {
      event = await api.fetchEventDetail(stored.returnEventId);
    }

    if (!event?.id) {
      clearReturnContextStorage();
      state.clearReturnContext();

      window.setTimeout(() => {
        isRestoringFromReturn = false;
      }, 500);

      return;
    }

    state.setSelectedEvent(event);
    map.focusEvent(event.id);
    scheduleMapRefresh();

    await chat.openForEvent(event);
    scheduleMapRefresh();

    if (stored.returnDrawerOpen) {
      renderDetailCard(event);
      drawer.open();
      state.setDrawerOpen(true);
      scheduleMapRefresh();
    }

    clearReturnContextStorage();
    state.clearReturnContext();

    window.setTimeout(() => {
      isRestoringFromReturn = false;
    }, 500);
  }

  function saveReturnContext({ returnEventId, returnDrawerOpen }) {
    try {
      sessionStorage.setItem(
        "gw:mappa-privati-v2:return-context",
        JSON.stringify({
          fromView: "map-private-v2",
          rootReturnTo: "/pages/mappa-privati-v2.html",
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
      const raw = sessionStorage.getItem("gw:mappa-privati-v2:return-context");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearReturnContextStorage() {
    try {
      sessionStorage.removeItem("gw:mappa-privati-v2:return-context");
    } catch {
      // silenzioso
    }
  }

  /* ===============================
     CLEANUP FUTURO (SE SERVE)
     =============================== */

  window.addEventListener("pageshow", () => {
    scheduleMapRefresh();
  });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    scheduleMapRefresh();
  }
});
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;

    delete window.gwMappaPrivatiUnlockPrivateEvent;

    unbindUi();
    chat.destroy();
    drawer.destroy();
    map.destroy();
  });
}

function getDomElements() {
  return {
    mapEl: document.getElementById("mappaMap"),

    drawerOverlay: document.getElementById("mappaDetailOverlay"),
    drawer: document.getElementById("mappaDetailDrawer"),
    drawerClose: document.getElementById("mappaDetailClose"),
    drawerContent: document.getElementById("mappaDetailContent"),

    chatHeader: document.getElementById("mappaChatHeader"),
    chatNotice: document.getElementById("mappaChatNotice"),
    chatMessages: document.getElementById("mappaChatMessages"),
    chatInput: document.getElementById("mappaChatInput"),
    chatSend: document.getElementById("mappaChatSend"),

    infoBtn: document.getElementById("mappaChatInfoBtn"),
unlockBtn: document.getElementById("mappaUnlockBtn"),
unlockBtnLabel: document.getElementById("mappaUnlockBtnLabel")
  };
}
