import { createMappaState } from "/js/mappa/mappa-state.js";
import { createMappaApi } from "/js/mappa/mappa-api.js";
import { createMappaRenderer } from "/js/mappa/mappa-renderer.js";
import { createMappaMap } from "/js/mappa/mappa-map.js";
import { createMappaChat } from "/js/mappa/mappa-chat.js";
import { createMappaDrawer } from "/js/mappa/mappa-drawer.js";
import {
  resolveUserIdentity,
  applyUserIdentityToTopbar
} from "/js/shared/user-identity.js";
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
  setMenuOpen(false);
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

    elements.menuBtn?.addEventListener("click", handleToggleMenu);
    elements.menuOverlay?.addEventListener("click", handleCloseMenu);
    elements.menuPanel?.addEventListener("click", handleMenuPanelClick);

    elements.searchBtn?.addEventListener("click", handleMenuSearch);
    elements.eventsBtn?.addEventListener("click", handleMenuEvents);
    elements.guideBtn?.addEventListener("click", handleMenuGuide);
    elements.switchRoleBtn?.addEventListener("click", handleMenuSwitchRole);
    elements.logoutBtn?.addEventListener("click", handleMenuLogout);

    elements.notificationsBtn?.addEventListener("click", handleMenuNotifications);

    document.addEventListener("keydown", handleMenuEscape);
  }

  function unbindUi() {
    elements.infoBtn?.removeEventListener("click", handleOpenDetail);
    elements.drawerContent?.removeEventListener("click", handleDrawerActions);

    elements.menuBtn?.removeEventListener("click", handleToggleMenu);
    elements.menuOverlay?.removeEventListener("click", handleCloseMenu);
    elements.menuPanel?.removeEventListener("click", handleMenuPanelClick);

    elements.searchBtn?.removeEventListener("click", handleMenuSearch);
    elements.eventsBtn?.removeEventListener("click", handleMenuEvents);
    elements.guideBtn?.removeEventListener("click", handleMenuGuide);
    elements.switchRoleBtn?.removeEventListener("click", handleMenuSwitchRole);
    elements.logoutBtn?.removeEventListener("click", handleMenuLogout);

    elements.notificationsBtn?.removeEventListener("click", handleMenuNotifications);

    document.removeEventListener("keydown", handleMenuEscape);
  }

  function handleDrawerActions(event) {
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
  const identity = await resolveUserIdentity();

  state.setCurrentUserId(
    identity?.id ??
    identity?._id ??
    identity?.userId ??
    null
  );

  applyUserIdentityToTopbar({
    greetingEl: elements.userName,
    roleEl: elements.userStatus,
    identity
  });
}
  function setMenuOpen(isOpen) {
    if (elements.menuOverlay) {
      elements.menuOverlay.hidden = !isOpen;
      elements.menuOverlay.setAttribute("aria-hidden", String(!isOpen));
    }

    if (elements.menuPanel) {
      elements.menuPanel.hidden = !isOpen;
      elements.menuPanel.setAttribute("aria-hidden", String(!isOpen));
    }

    if (elements.menuBtn) {
      elements.menuBtn.setAttribute("aria-expanded", String(isOpen));
    }
  }

  function isMenuOpen() {
    return Boolean(elements.menuPanel && !elements.menuPanel.hidden);
  }

  function handleToggleMenu(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    setMenuOpen(!isMenuOpen());
  }

  function handleCloseMenu() {
    setMenuOpen(false);
  }

  function handleMenuEscape(event) {
    if (event.key !== "Escape") return;
    handleCloseMenu();
  }

  function handleMenuPanelClick(event) {
    event.stopPropagation();
  }

  function handleMenuNotifications(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    window.alert("Centro notifiche disponibile a breve.");
  }

  function handleMenuSearch(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    window.location.href = "/pages/cerca-utenti.html";
  }

  function handleMenuEvents(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    window.location.href = "/pages/mappa-v2.html";
  }

  function handleMenuGuide(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    window.alert("Guida partecipante: in arrivo 🙂");
  }

  function handleMenuSwitchRole(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    window.alert("Cambio ruolo in riallineamento.");
  }

  function handleMenuLogout(event) {
    event?.preventDefault?.();
    handleCloseMenu();

    localStorage.removeItem("token");
    sessionStorage.removeItem("desiredRole");
    window.location.href = "/login.html";
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

window.location.href = `/evento.html?id=${encodeURIComponent(eventId)}`;  }

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

    userName: document.getElementById("mappaGreeting"),
    userStatus: document.getElementById("mappaRole"),

    menuBtn: document.getElementById("mappaMenuBtn"),
    notificationsBtn: document.getElementById("mappaNotificationsBtn"),
    menuOverlay: document.getElementById("mappaMenuOverlay"),
    menuPanel: document.getElementById("mappaMenuPanel"),
    searchBtn: document.getElementById("mappaSearchBtn"),
    eventsBtn: document.getElementById("mappaEventsBtn"),
    guideBtn: document.getElementById("mappaGuideBtn"),
    switchRoleBtn: document.getElementById("mappaSwitchRoleBtn"),
    logoutBtn: document.getElementById("mappaLogoutBtn"),

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
