import { createMappaState } from "/js/mappa/mappa-state.js";
import { createMappaApi } from "/js/mappa/mappa-api.js";
import { createMappaRenderer } from "/js/mappa/mappa-renderer.js";
import { createMappaMap } from "/js/mappa/mappa-map.js";
import { createMappaChat } from "/js/mappa/mappa-chat.js";
import { createMappaDrawer } from "/js/mappa/mappa-drawer.js";
import {
  requestUserPosition,
  normalizePosition
} from "/js/mappa/mappa-geo.js";
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const state = createMappaState();
  const api = createMappaApi();
  const renderer = createMappaRenderer();
  const DEFAULT_GEO_RADIUS = 30000;
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

  await loadEvents({
    fitBounds: true
  });
  await handleReturnContext();

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      map.refreshLayout();
    }, 200);
  });

  /* ===============================
     DOM
     =============================== */

  function getSelectedEvent() {
    return state.getState().selectedEvent;
  }

  function bindUi() {
    elements.infoBtn?.addEventListener("click", handleOpenDetail);
    elements.drawerContent?.addEventListener("click", handleDrawerActions);
    elements.locateBtn?.addEventListener("click", handleLocateMe);
  }

  function unbindUi() {
    elements.infoBtn?.removeEventListener("click", handleOpenDetail);
    elements.drawerContent?.removeEventListener("click", handleDrawerActions);
    elements.locateBtn?.removeEventListener("click", handleLocateMe);
  }
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
  function setGeoStatus(message = "", type = "") {
    if (!elements.geoStatus) return;

    elements.geoStatus.textContent = message;
    elements.geoStatus.dataset.state = type || "";
  }

  function setLocateBtnBusy(isBusy) {
    if (!elements.locateBtn) return;

    if (isBusy) {
      elements.locateBtn.setAttribute("disabled", "disabled");
      elements.locateBtn.dataset.state = "loading";

      if (elements.locateBtnLabel) {
        elements.locateBtnLabel.textContent = "Localizzo...";
      }
      return;
    }

    elements.locateBtn.removeAttribute("disabled");

    if (elements.locateBtnLabel) {
      elements.locateBtnLabel.textContent = "Vicino a me";
    }
  }
  function syncLocateBtnMode(mode) {
    if (!elements.locateBtn) return;

    elements.locateBtn.dataset.state =
      mode === "near_me" ? "active" : "idle";
  }
/* ===============================
     GEO
     =============================== */

  async function handleLocateMe() {
    try {
      setLocateBtnBusy(true);
      setGeoStatus("Sto cercando la tua posizione...", "loading");
      state.setGeoState({
        geoError: "",
        permission: state.getState().geo?.permission || "unknown"
      });
      const position = await requestUserPosition();
      const normalized = normalizePosition(position);

      if (!normalized) {
        throw {
          code: "INVALID_POSITION",
          message: "Posizione non valida"
        };
      }

      state.setGeoState({
        permission: "granted",
        mode: "near_me",
        userPosition: normalized,
        mapCenter: normalized,
        accuracy: position.accuracy ?? null,
        lastUpdate: position.timestamp ?? Date.now(),
        geoError: ""
      });
      syncLocateBtnMode("near_me");
     map.setUserLocation(normalized, {
        accuracy: position.accuracy ?? null,
        showCircle: true
      }); 
      map.setViewCenter(normalized, 9);
      await loadEvents({
        lat: normalized.lat,
        lng: normalized.lng,
        radius: state.getState().geo?.radiusMeters || DEFAULT_GEO_RADIUS,
        fitBounds: false
      });
      setGeoStatus("Posizione rilevata. Ti mostro l’area vicina a te.", "success");
    } catch (error) {
      const code =
        error && typeof error.code === "string"
          ? error.code
          : "UNKNOWN";

      state.setGeoState({
        permission:
          code === "PERMISSION_DENIED"
            ? "denied"
            : state.getState().geo?.permission || "unknown",
        mode: "explore",
        geoError: code
      });
      syncLocateBtnMode("explore");
      map.clearUserLocation();
      let message =
        "Geolocalizzazione non disponibile. Puoi continuare a esplorare la mappa manualmente.";

      if (code === "PERMISSION_DENIED") {
        message =
          "Permesso posizione negato. Puoi continuare a esplorare la mappa manualmente.";
      } else if (code === "TIMEOUT") {
        message =
          "Tempo scaduto nel rilevare la posizione. Riprova tra poco o usa la mappa manualmente.";
      } else if (code === "UNAVAILABLE") {
        message =
          "Posizione temporaneamente non disponibile. Puoi continuare a esplorare la mappa manualmente.";
      } else if (code === "NOT_SUPPORTED") {
        message =
          "Geolocalizzazione non supportata da questo dispositivo/browser.";
      }

      setGeoStatus(message, "error");
    } finally {
      setLocateBtnBusy(false);
    }
  }

  async function handleViewportChanged(viewport) {
    if (!viewport) return;

    const currentGeo = state.getState().geo || {};
    const userPosition = currentGeo.userPosition;

    const nextCenter = {
      lat: Number(viewport.lat),
      lng: Number(viewport.lng)
    };

    if (!Number.isFinite(nextCenter.lat) || !Number.isFinite(nextCenter.lng)) {
      return;
    }

    const sameAsUserPosition =
      userPosition &&
      Math.abs(userPosition.lat - nextCenter.lat) < 0.00001 &&
      Math.abs(userPosition.lng - nextCenter.lng) < 0.00001;

    const nextMode =
      currentGeo.mode === "near_me" && sameAsUserPosition
        ? "near_me"
        : "explore";

    state.setGeoState({
      mapCenter: nextCenter,
      mode: nextMode
    });
syncLocateBtnMode(nextMode);
    if (nextMode === "explore") {
      const bounds = map.getViewportBounds();

      await loadEvents({
        bounds,
        fitBounds: false
      });
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

      const currentGeo = state.getState().geo || {};

      const lat =
        Number.isFinite(Number(options.lat))
          ? Number(options.lat)
          : Number.isFinite(Number(currentGeo.mapCenter?.lat))
          ? Number(currentGeo.mapCenter.lat)
          : null;

      const lng =
        Number.isFinite(Number(options.lng))
          ? Number(options.lng)
          : Number.isFinite(Number(currentGeo.mapCenter?.lng))
          ? Number(currentGeo.mapCenter.lng)
          : null;

      const radius =
        Number.isFinite(Number(options.radius))
          ? Number(options.radius)
          : Number.isFinite(Number(currentGeo.radiusMeters))
          ? Number(currentGeo.radiusMeters)
          : DEFAULT_GEO_RADIUS;

      const bounds =
        options.bounds &&
        Number.isFinite(Number(options.bounds.north)) &&
        Number.isFinite(Number(options.bounds.south)) &&
        Number.isFinite(Number(options.bounds.east)) &&
        Number.isFinite(Number(options.bounds.west))
          ? {
              north: Number(options.bounds.north),
              south: Number(options.bounds.south),
              east: Number(options.bounds.east),
              west: Number(options.bounds.west)
            }
          : null;

      const fetchOptions = bounds
        ? bounds
        : Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng, radius }
        : {};

      const events = await api.fetchPublicMapEvents(fetchOptions);

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
function handleOpenFullChat(eventId) {
    if (!eventId) return;

    const params = new URLSearchParams();
    params.set("tab", "events");
    params.set("eventId", String(eventId).trim());
    params.set("rootReturnTo", "/pages/mappa-v2.html");

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
    `&fromView=map-v2` +
    `&rootReturnTo=${encodeURIComponent("/pages/mappa-v2.html")}` +
    `&returnEventId=${encodeURIComponent(eventId)}`;
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
          rootReturnTo: "/pages/mappa-v2.html",
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

  window.addEventListener("pageshow", () => {
  window.requestAnimationFrame(() => {
    map.refreshLayout();
    window.setTimeout(() => {
      map.refreshLayout();
    }, 120);
  });
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;

  window.requestAnimationFrame(() => {
    map.refreshLayout();
    window.setTimeout(() => {
      map.refreshLayout();
    }, 120);
  });
});
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;

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
    locateBtn: document.getElementById("mappaLocateBtn"),
    locateBtnLabel: document.getElementById("mappaLocateBtnLabel"),
    geoStatus: document.getElementById("mappaGeoStatus")
  };
}
