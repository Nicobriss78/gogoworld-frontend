import { createMappaState } from "/js/mappa/mappa-state.js";
import { createMappaApi } from "/js/mappa/mappa-api.js";
import { createMappaRenderer } from "/js/mappa/mappa-renderer.js";
import { createMappaMap } from "/js/mappa/mappa-map.js";
import { createMappaChat } from "/js/mappa/mappa-chat.js";
import { createMappaDrawer } from "/js/mappa/mappa-drawer.js";
import {
  requestUserPosition,
  startUserPositionWatch,
  stopUserPositionWatch,
  normalizePosition,
  getDistanceMeters
} from "/js/mappa/mappa-geo.js";
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const state = createMappaState();
  const api = createMappaApi();
  const renderer = createMappaRenderer();
  const DEFAULT_GEO_RADIUS = 20000;
  const GEO_FOLLOW_MODE = "follow_me";
  const GEO_MIN_MOVE_METERS = 5;
  const GEO_MAX_NOISY_ACCURACY = 120;
  const elements = getDomElements();

  if (!elements.mapEl) {
    return;
  }
let geoWatchActive = false;
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

  window.gwMappaDebug = {
    rotate: (deg) => map.setMapRotation(deg),
    resetRotation: () => map.resetMapRotation()
  };

  chat.mount();
  chat.showIdle();
syncLocateBtnMode(state.getState().geo?.mode || "explore");
  await loadEvents({
    fitBounds: true
  });
  await handleReturnContext();

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
    elements.clearEventBtn?.addEventListener("click", handleClearSelectedEvent);
    elements.drawerContent?.addEventListener("click", handleDrawerActions);
    elements.locateBtn?.addEventListener("click", handleLocateMe);
    elements.followBtn?.addEventListener("click", handleFollowMeToggle);
    elements.searchForm?.addEventListener("submit", handleSearchSubmit);
    elements.searchClear?.addEventListener("click", handleSearchClear);
    elements.filtersToggle?.addEventListener("click", handleFiltersToggle);
    elements.filtersApply?.addEventListener("click", handleFiltersApply);
    elements.filtersReset?.addEventListener("click", handleFiltersReset);
  }

  function unbindUi() {
    elements.infoBtn?.removeEventListener("click", handleOpenEventPage);
    elements.clearEventBtn?.removeEventListener("click", handleClearSelectedEvent);
    elements.drawerContent?.removeEventListener("click", handleDrawerActions);
    elements.locateBtn?.removeEventListener("click", handleLocateMe);
    elements.followBtn?.removeEventListener("click", handleFollowMeToggle);
    elements.searchForm?.removeEventListener("submit", handleSearchSubmit);
    elements.searchClear?.removeEventListener("click", handleSearchClear);
    elements.filtersToggle?.removeEventListener("click", handleFiltersToggle);
    elements.filtersApply?.removeEventListener("click", handleFiltersApply);
    elements.filtersReset?.removeEventListener("click", handleFiltersReset);
  }
  function clearActiveEventSelection() {
    drawer.close();
    state.clearSelectedEvent();
    state.resetChatState();
    chat.showIdle();

    if (elements.clearEventBtn) {
      elements.clearEventBtn.hidden = true;
    }
  }

  function handleClearSelectedEvent(event) {
    event?.preventDefault?.();
    clearActiveEventSelection();
    setGeoStatus("Evento selezionato chiuso. Puoi esplorare la mappa.", "success");
  }
  async function handleSearchSubmit(event) {
    event?.preventDefault?.();

    const query = String(elements.searchInput?.value || "").trim();

    if (!query) {
      await handleSearchClear();
      return;
    }

    clearActiveEventSelection();
    state.setSearchQuery(query);

    if (elements.searchClear) {
      elements.searchClear.hidden = false;
    }

    setGeoStatus(`Ricerca attiva: ${query}`, "success");

    await loadEvents({
      q: query,
      fitBounds: true
    });
  }

  async function handleSearchClear() {
    clearActiveEventSelection();
    state.clearSearch();

    if (elements.searchInput) {
      elements.searchInput.value = "";
    }

    if (elements.searchClear) {
      elements.searchClear.hidden = true;
    }

    setGeoStatus("Ricerca cancellata. Torno alla mappa esplorabile.", "success");

    await loadEvents({
      fitBounds: true
    });
  }
  function handleFiltersToggle(event) {
    event?.preventDefault?.();

    const currentFilters = state.getState().filters || {};
    const nextOpen = !Boolean(currentFilters.isOpen);

    state.setFilters({
      isOpen: nextOpen
    });

    if (elements.filtersPanel) {
      elements.filtersPanel.hidden = !nextOpen;
    }

    if (elements.filtersToggle) {
      elements.filtersToggle.setAttribute("aria-expanded", String(nextOpen));
    }
  }

  async function handleFiltersApply(event) {
    event?.preventDefault?.();

    clearActiveEventSelection();

    state.setFilters({
      category: String(elements.filterCategory?.value || ""),
      period: String(elements.filterPeriod?.value || "all"),
      status: String(elements.filterStatus?.value || "all"),
      isFree: String(elements.filterIsFree?.value || ""),
      isOpen: false
    });

    if (elements.filtersPanel) {
      elements.filtersPanel.hidden = true;
    }

    syncFiltersToggleLabel();

    const searchQuery = String(state.getState().search?.query || "").trim();

    setGeoStatus(buildActiveFiltersMessage(), "success");

    await loadEvents({
      q: searchQuery,
      fitBounds: true
    });
  }

  async function handleFiltersReset(event) {
    event?.preventDefault?.();

    clearActiveEventSelection();
    state.resetFilters();

    if (elements.filterCategory) elements.filterCategory.value = "";
    if (elements.filterPeriod) elements.filterPeriod.value = "all";
    if (elements.filterStatus) elements.filterStatus.value = "all";
    if (elements.filterIsFree) elements.filterIsFree.value = "";

    if (elements.filtersPanel) {
      elements.filtersPanel.hidden = true;
    }

    syncFiltersToggleLabel();

    const searchQuery = String(state.getState().search?.query || "").trim();

    setGeoStatus(
      searchQuery ? `Filtri rimossi. Ricerca attiva: ${searchQuery}` : "Filtri rimossi.",
      "success"
    );

    await loadEvents({
      q: searchQuery,
      fitBounds: true
    });
  }

  function syncFiltersToggleLabel() {
    const filters = state.getState().filters || {};
    const activeCount = Number(filters.activeCount || 0);

    if (elements.filtersToggle) {
      elements.filtersToggle.textContent =
        activeCount > 0 ? `Filtri (${activeCount})` : "Filtri";
      elements.filtersToggle.setAttribute(
        "aria-expanded",
        String(Boolean(filters.isOpen))
      );
    }
  }

  function buildActiveFiltersMessage() {
    const filters = state.getState().filters || {};
    const count = Number(filters.activeCount || 0);
    const searchQuery = String(state.getState().search?.query || "").trim();

    if (searchQuery && count > 0) {
      return `Ricerca attiva: ${searchQuery} · ${count} filtri`;
    }

    if (count > 0) {
      return `${count} filtri attivi`;
    }

    return searchQuery ? `Ricerca attiva: ${searchQuery}` : "Filtri applicati";
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
  if (elements.locateBtn) {
    elements.locateBtn.dataset.state =
      mode === "near_me" ? "active" : "idle";
  }

  if (elements.followBtn) {
    elements.followBtn.dataset.state =
      mode === GEO_FOLLOW_MODE ? "active" : "idle";
  }
}
/* ===============================
     GEO
     =============================== */
  function handleGeoWatchUpdate(position) {
    const normalized = normalizePosition(position);
    if (!normalized) return;

    const currentGeo = state.getState().geo || {};
    const currentMode = String(currentGeo.mode || "explore").trim();

    if (currentMode !== GEO_FOLLOW_MODE) return;

    const nextAccuracy = Number(position?.accuracy);
    const prevPosition = currentGeo.userPosition || null;
    const prevAccuracy = Number(currentGeo?.accuracy);
    const nextTimestamp = Number(position?.timestamp || Date.now());
    const prevTimestamp = Number(currentGeo?.lastUpdate || 0);
    const movedMeters =
      prevPosition ? getDistanceMeters(prevPosition, normalized) : null;

    if (Number.isFinite(prevTimestamp) && nextTimestamp <= prevTimestamp) {
      return;
    }

    if (
      prevPosition &&
      Number.isFinite(nextAccuracy) &&
      nextAccuracy > GEO_MAX_NOISY_ACCURACY &&
      (!Number.isFinite(movedMeters) || movedMeters < 15) &&
      (!Number.isFinite(prevAccuracy) || nextAccuracy >= prevAccuracy)
    ) {
      return;
    }

    state.setGeoState({
      permission: "granted",
      userPosition: normalized,
      mapCenter: normalized,
      accuracy: position.accuracy ?? null,
      lastUpdate: nextTimestamp,
      geoError: ""
    });

    map.setUserLocation(normalized, {
  accuracy: position.accuracy ?? null,
  showCircle: true,
  mode: "dot"
});

    if (
  currentMode === GEO_FOLLOW_MODE &&
  (!prevPosition || !Number.isFinite(movedMeters) || movedMeters >= GEO_MIN_MOVE_METERS)
) {
  if (
    prevPosition &&
    Number.isFinite(movedMeters) &&
    movedMeters >= GEO_MIN_MOVE_METERS
  ) {
    const bearing = calculateBearing(prevPosition, normalized);

const smoothBearing = normalizeBearingDelta(bearing);

map.setUserLocation(normalized, {
  accuracy: position.accuracy ?? null,
  showCircle: true,
  mode: "arrow",
  bearing: smoothBearing
});

map.setMapRotation(-smoothBearing);
  }

  map.panToPosition(normalized);
}
  }
function calculateBearing(from, to) {
  const lat1 = (Number(from?.lat) * Math.PI) / 180;
  const lat2 = (Number(to?.lat) * Math.PI) / 180;
  const deltaLng = ((Number(to?.lng) - Number(from?.lng)) * Math.PI) / 180;

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(deltaLng)
  ) {
    return 0;
  }

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
  let lastBearing = null;

function normalizeBearingDelta(newBearing) {
  if (lastBearing === null) {
    lastBearing = newBearing;
    return newBearing;
  }

  let delta = newBearing - lastBearing;

  // shortest path (-180 / +180)
  delta = ((delta + 540) % 360) - 180;

  const smoothed = lastBearing + delta;

  lastBearing = smoothed;

  return smoothed;
}
  function handleGeoWatchError(error) {
    const code =
      error && typeof error.code === "string"
        ? error.code
        : "UNKNOWN";

    state.setGeoState({
      permission:
        code === "PERMISSION_DENIED"
          ? "denied"
          : state.getState().geo?.permission || "unknown",
      geoError: code
    });

    if (code === "PERMISSION_DENIED") {
      setGeoStatus(
        "Permesso posizione negato. Puoi continuare a esplorare la mappa manualmente.",
        "error"
      );
    }
  }

  function ensureGeoWatchStarted() {
    if (geoWatchActive) return;

    const watchId = startUserPositionWatch({
      onUpdate: handleGeoWatchUpdate,
      onError: handleGeoWatchError
    });

    geoWatchActive = watchId != null;
  }

  function stopGeoWatchTracking() {
    stopUserPositionWatch();
    geoWatchActive = false;
  }
  function handleFollowMeToggle() {
  const currentGeo = state.getState().geo || {};
  const currentMode = currentGeo.mode || "explore";
  const selectedEvent = state.getState().selectedEvent || null;
    clearActiveEventSelection();
  if (currentMode === GEO_FOLLOW_MODE) {
  stopGeoWatchTracking();
  map.resetMapRotation();

  state.setGeoState({
    mode: "explore"
  });

    syncLocateBtnMode("explore");
    setGeoStatus("Modalità Seguimi disattivata.", "success");
    return;
  }

  state.setGeoState({
    mode: GEO_FOLLOW_MODE,
    geoError: ""
  });

  syncLocateBtnMode(GEO_FOLLOW_MODE);
  setGeoStatus("Modalità Seguimi attiva. Sto seguendo i tuoi spostamenti...", "loading");

  ensureGeoWatchStarted();
}
  async function handleLocateMe() {
    try {
      clearActiveEventSelection();
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

      await loadEvents({
        lat: normalized.lat,
        lng: normalized.lng,
        radius: state.getState().geo?.radiusMeters || DEFAULT_GEO_RADIUS,
        fitBounds: false
      });

      map.setViewCenter(normalized, 12);

      setGeoStatus("Posizione rilevata. Ti mostro la tua area e gli eventi vicini.", "success");
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
    const nextCenter = {
      lat: Number(viewport.lat),
      lng: Number(viewport.lng)
    };

    if (!Number.isFinite(nextCenter.lat) || !Number.isFinite(nextCenter.lng)) {
      return;
    }
clearActiveEventSelection();
    if (viewport.source !== "user") {
      state.setGeoState({
        mapCenter: nextCenter
      });
      return;
    }

    state.setGeoState({
      mapCenter: nextCenter,
      mode: "explore"
    });
    syncLocateBtnMode("explore");
stopGeoWatchTracking();
map.resetMapRotation();
setGeoStatus("Modalità Seguimi disattivata. Puoi esplorare la mappa manualmente.", "success");

const bounds = map.getViewportBounds();

    await loadEvents({
      bounds,
      fitBounds: false
    });
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

      const searchState = state.getState().search || {};
      const filtersState = state.getState().filters || {};
      const searchQuery = String(options.q || searchState.query || "").trim();
      const activeStatus = String(filtersState.status || "all");

      const fetchOptions = {
        ...(searchQuery ? { q: searchQuery } : {}),
        ...(filtersState.category ? { category: filtersState.category } : {}),
        ...(filtersState.isFree ? { isFree: filtersState.isFree } : {}),
        ...buildPeriodQuery(filtersState.period),
        ...(
          searchQuery
            ? {}
            : bounds
            ? bounds
            : Number.isFinite(lat) && Number.isFinite(lng)
            ? { lat, lng, radius }
            : {}
        )
      };

      const rawEvents = await api.fetchPublicMapEvents(fetchOptions);
      const events =
        activeStatus && activeStatus !== "all"
          ? rawEvents.filter((event) => event?.status === activeStatus)
          : rawEvents;
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
function buildPeriodQuery(period = "all") {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (period) {
      case "today": {
        const end = new Date(start);
        end.setDate(start.getDate() + 1);

        return {
          dateStart: start.toISOString(),
          dateEnd: end.toISOString()
        };
      }

      case "weekend": {
        const day = start.getDay();
        const daysUntilSaturday = (6 - day + 7) % 7;
        const saturday = new Date(start);
        saturday.setDate(start.getDate() + daysUntilSaturday);

        const monday = new Date(saturday);
        monday.setDate(saturday.getDate() + 2);

        return {
          dateStart: saturday.toISOString(),
          dateEnd: monday.toISOString()
        };
      }

      case "7days": {
        const end = new Date(start);
        end.setDate(start.getDate() + 7);

        return {
          dateStart: start.toISOString(),
          dateEnd: end.toISOString()
        };
      }

      case "30days": {
        const end = new Date(start);
        end.setDate(start.getDate() + 30);

        return {
          dateStart: start.toISOString(),
          dateEnd: end.toISOString()
        };
      }

      default:
        return {};
    }
}
  /* ===============================
     SELEZIONE EVENTO DA MAPPA
     =============================== */

  async function handleMapEventSelect(event) {
    if (!event?.id) return;

    state.setSelectedEvent(event);
if (elements.clearEventBtn) {
      elements.clearEventBtn.hidden = false;
}
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

  function handleOpenEventPage(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const selectedEvent =
    state.getState().selectedEvent ||
    state.getState().eventsById.get(state.getState().selectedEventId);

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
    scheduleMapRefresh();
  });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") {
    stopGeoWatchTracking();
    return;
  }

  if ((state.getState().geo?.mode || "explore") === GEO_FOLLOW_MODE) {
  ensureGeoWatchStarted();
}

  scheduleMapRefresh();
});
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;

    stopGeoWatchTracking();
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
    clearEventBtn: document.getElementById("mappaChatClearBtn"),
    locateBtn: document.getElementById("mappaLocateBtn"),
    followBtn: document.getElementById("mappaFollowBtn"),
    searchForm: document.getElementById("mappaSearchForm"),
    searchInput: document.getElementById("mappaSearchInput"),
    searchClear: document.getElementById("mappaSearchClear"),
    locateBtnLabel: document.getElementById("mappaLocateBtnLabel"),
    geoStatus: document.getElementById("mappaGeoStatus")
    };
  }
