/**
 * GoGoWorld.life — HOME vNext Controller
 * Controller dedicato della nuova Home.
 * Solo logica Home: stato, split eventi, rendering, rail mode,
 * banner engine, autofocus, scrollbars, delegation.
 */
import {
  renderHomeView,
  renderLoading,
  renderError,
  bindRailModeDelegation,
  bindCardActions,
} from "./home-view.js";

import { fetchHomePayload } from "./home-api.js";

/* =========================================================
   HELPERS DOM
   ========================================================= */

function getRequiredElement(selector, root = document) {
  const node = root.querySelector(selector);
  if (!node) {
    throw new Error(`Elemento obbligatorio non trovato: ${selector}`);
  }
  return node;
}

function createDomRefs(root = document) {
  return {
    root: getRequiredElement("#homeRoot", root),
    viewport: getRequiredElement("#homeViewport", root),
    greeting: getRequiredElement("#homeGreeting", root),
    role: getRequiredElement("#homeRole", root),

    notificationsBtn: getRequiredElement("#homeNotificationsBtn", root),
    menuBtn: getRequiredElement("#homeMenuBtn", root),
    menuOverlay: getRequiredElement("#homeMenuOverlay", root),
    menuPanel: getRequiredElement("#homeMenuPanel", root),
    searchBtn: getRequiredElement("#homeSearchBtn", root),
    eventsBtn: getRequiredElement("#homeEventsBtn", root),
    guideBtn: getRequiredElement("#homeGuideBtn", root),
    switchRoleBtn: getRequiredElement("#homeSwitchRoleBtn", root),
    logoutBtn: getRequiredElement("#homeLogoutBtn", root),

    generalShell: getRequiredElement("#homeRailShellGeneral", root),
    generalActiveRail: getRequiredElement("#homeRailGeneralActive", root),
    generalPastRail: getRequiredElement("#homeRailGeneralPast", root),
    generalActiveScrollbar: getRequiredElement("#homeScrollbarGeneralActive", root),
    generalPastScrollbar: getRequiredElement("#homeScrollbarGeneralPast", root),

    joinedShell: getRequiredElement("#homeRailShellJoined", root),
    joinedActiveRail: getRequiredElement("#homeRailJoinedActive", root),
    joinedPastRail: getRequiredElement("#homeRailJoinedPast", root),
    joinedActiveScrollbar: getRequiredElement("#homeScrollbarJoinedActive", root),
    joinedPastScrollbar: getRequiredElement("#homeScrollbarJoinedPast", root),
  };
}
async function setHomeTopbarIdentity(dom) {
  const identity = await resolveUserIdentity();

  applyUserIdentityToTopbar({
    greetingEl: dom.greeting,
    roleEl: dom.role,
    identity,
  });
}
function renderHomeMenu(dom, isOpen) {
  const open = Boolean(isOpen);

  dom.menuBtn.setAttribute("aria-expanded", String(open));

  dom.menuOverlay.hidden = !open;
  dom.menuOverlay.setAttribute("aria-hidden", String(!open));

  dom.menuPanel.hidden = !open;
  dom.menuPanel.setAttribute("aria-hidden", String(!open));
}

function bindTopbarActions(dom, uiState) {
  const closeMenu = () => {
    uiState.menuOpen = false;
    renderHomeMenu(dom, uiState.menuOpen);
  };

  const toggleMenu = () => {
    uiState.menuOpen = !uiState.menuOpen;
    renderHomeMenu(dom, uiState.menuOpen);
  };

  dom.notificationsBtn.addEventListener("click", () => {
    window.alert("Centro notifiche disponibile a breve.");
  });

  dom.menuBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu();
  });

  dom.menuOverlay.addEventListener("click", () => {
    closeMenu();
  });

  dom.menuPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && uiState.menuOpen) {
      closeMenu();
    }
  });

  dom.searchBtn.addEventListener("click", () => {
    closeMenu();
    window.location.href = "/pages/cerca-utenti.html";
  });

  dom.eventsBtn.addEventListener("click", () => {
    closeMenu();
    window.location.href = "/pages/home-v2.html";
  });

  dom.guideBtn.addEventListener("click", () => {
    closeMenu();
    window.alert("Guida partecipante disponibile a breve.");
  });

  dom.switchRoleBtn.addEventListener("click", () => {
    closeMenu();
    window.alert("Cambio ruolo in riallineamento.");
  });

  dom.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  });
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

  function renderHome(dom, payload) {
  return renderHomeView(dom, payload);
}

/* =========================================================
   INIT
   ========================================================= */

export async function initHome(root = document) {
  const dom = createDomRefs(root);
  const uiState = { menuOpen: false };

  await setHomeTopbarIdentity(dom);
  renderHomeMenu(dom, uiState.menuOpen);
  bindTopbarActions(dom, uiState);

  renderLoading(dom);
  bindRailModeDelegation(dom);
  bindCardActions(dom);

  try {
    const payload = await fetchHomePayload();
    return renderHome(dom, payload);
  } catch (error) {
    console.error("[HOME] init error:", error);
    renderError(
      dom,
      error instanceof Error
        ? error.message
        : "Si è verificato un errore durante il caricamento della Home."
    );
    return null;
  }
}
