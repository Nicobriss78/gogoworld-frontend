import { getViewConfig } from "./shared-view-registry.js";
import { getNavItems } from "./shared-nav-registry.js";
import { getMenuItems } from "./shared-menu-registry.js";
import { resolveShellContext } from "./shared-capability-resolver.js";
import { setState, getState, subscribe } from "./shared-state.js";
import {
  resolveNavRequest,
  resolveMenuRequest,
  resolveViewRequest,
} from "./shared-router.js";
import { executeAction } from "./shared-actions.js";
import { mountTopbar } from "./shared-topbar.js";
import { mountMenu, setMenuOpen } from "./shared-menu.js";
import { mountBottomnav } from "./shared-bottomnav.js";

const SHARED_ICON_SPRITE_ID = "shared-v2-icon-sprite";

const SHARED_ICON_SPRITE_MARKUP = `
  <div
    id="${SHARED_ICON_SPRITE_ID}"
    aria-hidden="true"
    style="position:absolute;width:0;height:0;overflow:hidden"
  >
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <symbol id="gw-icon-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="M20 20l-3.5-3.5"></path>
      </symbol>

      <symbol id="gw-icon-pin" viewBox="0 0 24 24">
        <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z"></path>
        <circle cx="12" cy="10" r="2.5"></circle>
      </symbol>

      <symbol id="gw-icon-chat" viewBox="0 0 24 24">
        <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.3-.2-3.3-.6L3 21l1.7-4.2A7.4 7.4 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"></path>
        <path d="M8 12h.01M12 12h.01M16 12h.01"></path>
      </symbol>

      <symbol id="gw-icon-bell" viewBox="0 0 24 24">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7z"></path>
        <path d="M10 19a2 2 0 0 0 4 0"></path>
      </symbol>

      <symbol id="gw-icon-menu" viewBox="0 0 24 24">
        <path d="M4 6h16"></path>
        <path d="M4 12h16"></path>
        <path d="M4 18h16"></path>
      </symbol>

      <symbol id="gw-icon-map" viewBox="0 0 24 24">
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"></path>
        <path d="M9 4v14"></path>
        <path d="M15 6v14"></path>
      </symbol>

      <symbol id="gw-icon-calendar" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="2"></rect>
        <path d="M16 3v4"></path>
        <path d="M8 3v4"></path>
        <path d="M3 10h18"></path>
      </symbol>

      <symbol id="gw-icon-home" viewBox="0 0 24 24">
        <path d="M4 10.5L12 4l8 6.5"></path>
        <path d="M6 9.5V20h12V9.5"></path>
      </symbol>

      <symbol id="gw-icon-users" viewBox="0 0 24 24">
        <circle cx="9" cy="9" r="3"></circle>
        <circle cx="17" cy="10" r="2.5"></circle>
        <path d="M4.5 19a4.5 4.5 0 0 1 9 0"></path>
        <path d="M14.5 18a3.5 3.5 0 0 1 5 0"></path>
      </symbol>

      <symbol id="gw-icon-profile" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.5"></circle>
        <path d="M5 20a7 7 0 0 1 14 0"></path>
      </symbol>
    </svg>
  </div>
`;

function ensureSharedIconSprite() {
  if (document.getElementById(SHARED_ICON_SPRITE_ID)) return;
  document.body.insertAdjacentHTML("afterbegin", SHARED_ICON_SPRITE_MARKUP);
}

export function initSharedShell() {
  ensureSharedIconSprite();

  const viewId = document.body?.dataset?.viewId;

  if (!viewId) {
    console.warn("shared-bootstrap: missing data-view-id");
    return;
  }

  const viewConfig = getViewConfig(viewId);

  if (!viewConfig) {
    console.warn("shared-bootstrap: unknown viewId", viewId);
    return;
  }

  const menuItems = getMenuItems();
  const navItems = getNavItems();
  const shellContext = resolveShellContext(viewConfig, menuItems);

  setState({
    currentViewId: viewId,
    activeNavKey: viewConfig.activeNavKey,
    capabilities: shellContext.capabilities,
    menuOpen: false,
  });

  mountTopbar({
    mountPoint: document.getElementById("sharedTopbarMount"),
    viewConfig,
    shellContext,
    onEvent: handleEvent,
  });

  mountMenu({
    mountPoint: document.getElementById("sharedMenuMount"),
    shellContext,
    menuItems,
    onEvent: handleEvent,
  });

  mountBottomnav({
    mountPoint: document.getElementById("sharedBottomnavMount"),
    navItems,
    activeNavKey: viewConfig.activeNavKey,
    onEvent: handleEvent,
    mode: viewConfig.bottomnavMode,
  });

  subscribe((state) => {
    setMenuOpen(document.getElementById("sharedMenuMount"), state.menuOpen);
  });

  async function handleEvent(event) {
    if (!event) return;

    const state = getState();

    if (event.type === "topbar-action") {
      if (event.action === "menu") {
        setState({ menuOpen: !state.menuOpen });
        return;
      }

      if (event.action === "map") {
        return handleResult(resolveViewRequest("map"));
      }

      if (event.action === "search") {
        const rootReturnTo = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.href = `/pages/cerca-utenti-v2.html?rootReturnTo=${rootReturnTo}`;
        return;
      }

      if (event.action === "messages") {
        const rootReturnTo = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.href = `/pages/messages-v2.html?rootReturnTo=${rootReturnTo}`;
        return;
      }

      if (event.action === "notifications") {
        window.alert("Centro notifiche disponibile a breve.");
        return;
      }
    }

    if (event.type === "menu-item") {
      return handleResult(
        resolveMenuRequest(event.menuItemId, {
          capabilities: state.capabilities,
        })
      );
    }

    if (event.type === "menu-close") {
      setState({ menuOpen: false });
      return;
    }

    if (event.type === "nav-item") {
      return handleResult(resolveNavRequest(event.navKey));
    }
  }

  async function handleResult(result) {
    if (!result) return;

    if (result.type === "navigate") {
      setState({ menuOpen: false });
      navigateTo(result.targetViewId);
      return;
    }

    if (result.type === "action") {
      await executeAction(result.actionId, {
        capabilities: getState().capabilities,
        currentViewId: getState().currentViewId,
        onAction: handleContextAction,
      });
      return;
    }

    if (result.type === "blocked") {
      console.warn("blocked action:", result);
      return;
    }

    if (result.type === "not-found") {
      console.warn("not found:", result);
      return;
    }
  }

  async function handleContextAction(actionId, context = {}) {
    if (actionId === "private-unlock" && context.currentViewId === "private-map") {
      const handler = window.gwMappaPrivatiUnlockPrivateEvent;

      if (typeof handler === "function") {
        return handler();
      }

      console.warn("private-unlock handler missing on private-map");
      return {
        status: "missing-handler",
        actionId,
      };
    }

    return {
      status: "not-handled",
      actionId,
    };
  }

  function navigateTo(viewId) {
    const map = {
      home: "/pages/home-v2.html",
      following: "/pages/partecipante-seguiti-v2.html",
      map: "/pages/mappa-v2.html",
      "private-map": "/pages/mappa-privati-v2.html",
      profile: "/pages/profilo-v2.html",
      "following-users": "/pages/seguiti-utenti-v2.html",
      messages: "/pages/messages-v2.html",
      "user-search": `/pages/cerca-utenti-v2.html?returnTo=${encodeURIComponent(
  window.location.pathname + window.location.search
)}`,
    };
    const url = map[viewId];

    if (!url) {
      console.warn("navigation: missing mapping for", viewId);
      return;
    }

    window.location.href = url;
  }
}
