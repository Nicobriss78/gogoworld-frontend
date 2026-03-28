import { createMappaPrivatiState } from "/js/mappa-privati/mappa-privati-state.js";
import { createMappaPrivatiApi } from "/js/mappa-privati/mappa-privati-api.js";
import { createMappaPrivatiRenderer } from "/js/mappa-privati/mappa-privati-renderer.js";
import { createMappaPrivatiMap } from "/js/mappa-privati/mappa-privati-map.js";
import { createMappaPrivatiChat } from "/js/mappa-privati/mappa-privati-chat.js";
import { createMappaPrivatiDrawer } from "/js/mappa-privati/mappa-privati-drawer.js";
import {
  resolveUserIdentity,
  applyUserIdentityToTopbar
} from "/js/shared/user-identity.js";
document.addEventListener("DOMContentLoaded", init);

async function init() {
const state = createMappaPrivatiState();
  const api = createMappaPrivatiApi();
  const renderer = createMappaPrivatiRenderer();
  const elements = getDomElements();

  if (!elements.mapEl) {
    return;
  }

  const drawer = createMappaPrivatiDrawer({
    overlayEl: elements.drawerOverlay,
    drawerEl: elements.drawer,
    closeBtnEl: elements.drawerClose,
    onClose: () => {
      state.setDrawerOpen(false);
    }
  });

  const map = createMappaPrivatiMap({
    mapElementId: "mappaMap",
    onSelectEvent: handleMapEventSelect
  });

  const chat = createMappaPrivatiChat({
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

  window.gwMappaPrivatiUnlockPrivateEvent = handleUnlockPrivateEventRequest;

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
    elements.unlockBtn?.addEventListener("click", handleMenuUnlockPrivate);
    elements.guideBtn?.addEventListener("click", handleMenuGuide);
    elements.switchRoleBtn?.addEventListener("click", handleMenuSwitchRole);
    elements.logoutBtn?.addEventListener("click", handleMenuLogout);

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
    elements.unlockBtn?.removeEventListener("click", handleMenuUnlockPrivate);
    elements.guideBtn?.removeEventListener("click", handleMenuGuide);
    elements.switchRoleBtn?.removeEventListener("click", handleMenuSwitchRole);
    elements.logoutBtn?.removeEventListener("click", handleMenuLogout);

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

  function handleMenuSearch(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    window.location.href = "/pages/cerca-utenti.html";
  }

  function handleMenuEvents(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    window.location.href = "/pages/mappa-privati-v2.html";
  }

  async function handleMenuUnlockPrivate(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    await handleUnlockPrivateEventRequest();
  }

  function handleMenuGuide(event) {
    event?.preventDefault?.();
    handleCloseMenu();
    window.alert("Guida partecipante: in arrivo 🙂");
  }

  function handleMenuSwitchRole(event) {
    event?.preventDefault?.();
    handleCloseMenu();

    sessionStorage.setItem("desiredRole", "organizer");
    window.location.href = "/organizzatore.html";
  }

  function handleMenuLogout(event) {
    event?.preventDefault?.();
    handleCloseMenu();

    localStorage.removeItem("token");
    sessionStorage.removeItem("desiredRole");
    window.location.href = "/login.html";
  }

  /* ===============================
     SBLOCCO EVENTO PRIVATO VIA CODICE
     =============================== */

  async function handleUnlockPrivateEventRequest() {
    const COOLDOWN_KEY = "gw_priv_unlock_cooldown_until";

    const until = Number(sessionStorage.getItem(COOLDOWN_KEY) || "0");
    const now = Date.now();

    if (until && now < until) {
      const secLeft = Math.max(1, Math.ceil((until - now) / 1000));
      window.alert(`⛔ Troppi tentativi. Attendi ${secLeft}s prima di riprovare.`);
      return { ok: false, reason: "COOLDOWN_ACTIVE" };
    }

    const code = window.prompt("Inserisci il codice dell'evento privato:");
    if (!code) {
      return { ok: false, reason: "PROMPT_CANCELLED" };
    }

    const result = await api.unlockPrivateEventByCode(code);

    if (!result?.ok) {
      if (result?.status === 429) {
        const waitSec = 600;
        sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + waitSec * 1000));
        window.alert(`⛔ Troppi tentativi consecutivi. Attendi ${waitSec}s e riprova.`);
        return { ok: false, reason: "RATE_LIMIT" };
      }

      if (result?.status === 404) {
        window.alert("❌ Codice non valido o evento non disponibile. Controlla il codice e riprova.");
        return { ok: false, reason: "CODE_NOT_VALID" };
      }

      if (result?.status === 401 || result?.status === 403) {
        window.alert("⚠️ Sessione non valida. Effettua di nuovo il login.");
        setTimeout(() => {
          window.location.href = "/login.html";
        }, 800);
        return { ok: false, reason: "AUTH_INVALID" };
      }

      window.alert(result?.message || "Operazione non riuscita.");
      return { ok: false, reason: "UNKNOWN_ERROR" };
    }

    sessionStorage.removeItem(COOLDOWN_KEY);

    window.alert("Evento privato sbloccato ✅");

    await loadEvents();

    const selectedEvent = state.getState().selectedEvent;
    if (selectedEvent?.id) {
      const refreshedSelected =
        state.getState().eventsById.get(selectedEvent.id) || null;

      if (refreshedSelected?.id) {
        state.setSelectedEvent(refreshedSelected);

        if (state.getState().drawerOpen) {
          renderDetailCard(refreshedSelected);
        }

        map.focusEvent(refreshedSelected.id);
        await chat.openForEvent(refreshedSelected);
      } else {
        chat.clear();
      }
    }

    return { ok: true };
  }

  /* ===============================
     LOAD EVENTI PRIVATI
     =============================== */

  async function loadEvents() {
    try {
      state.setMapStatus({
        mapLoading: true,
        mapError: ""
      });

      const events = await api.fetchPrivateMapEvents();

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
    if (stored.fromView !== "map-private-v2") return;

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
        "gw:mappa-privati-v2:return-context",
        JSON.stringify({
          fromView: "map-private-v2",
          returnTo: "/pages/mappa-privati-v2.html",
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

  window.addEventListener("beforeunload", () => {
    try {
      delete window.gwMappaPrivatiUnlockPrivateEvent;
    } catch {
      window.gwMappaPrivatiUnlockPrivateEvent = undefined;
    }

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

    menuBtn: document.getElementById("mappaPrivatiMenuBtn"),
    notificationsBtn: document.getElementById("mappaPrivatiNotificationsBtn"),
    menuOverlay: document.getElementById("mappaPrivatiMenuOverlay"),
    menuPanel: document.getElementById("mappaPrivatiMenuPanel"),
    unlockBtn: document.getElementById("mappaPrivatiUnlockBtn"),
    guideBtn: document.getElementById("mappaPrivatiGuideBtn"),
    switchRoleBtn: document.getElementById("mappaPrivatiSwitchRoleBtn"),
    logoutBtn: document.getElementById("mappaPrivatiLogoutBtn"),

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
