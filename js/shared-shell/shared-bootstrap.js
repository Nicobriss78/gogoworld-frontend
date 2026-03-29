import { getViewConfig } from "./shared-view-registry.js";
import { getNavItems } from "./shared-nav-registry.js";
import { getMenuItems } from "./shared-menu-registry.js";
import { resolveShellContext } from "./shared-capability-resolver.js";

import { setState, getState, subscribe } from "./shared-state.js";

import {
  resolveNavRequest,
  resolveMenuRequest,
  resolveViewRequest,
  resolveActionRequest,
} from "./shared-router.js";

import { executeAction } from "./shared-actions.js";

import { mountTopbar } from "./shared-topbar.js";
import { mountMenu, setMenuOpen } from "./shared-menu.js";
import { mountBottomnav } from "./shared-bottomnav.js";

export function initSharedShell() {
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

  // init state
  setState({
    currentViewId: viewId,
    activeNavKey: viewConfig.activeNavKey,
    capabilities: shellContext.capabilities,
    menuOpen: false,
  });

  // mount UI
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

  // subscribe state updates
  subscribe((state) => {
    setMenuOpen(document.getElementById("sharedMenuMount"), state.menuOpen);
  });

  async function handleEvent(event) {
    if (!event) return;

    const state = getState();

    // TOPBAR
    if (event.type === "topbar-action") {
      if (event.action === "menu") {
        setState({ menuOpen: !state.menuOpen });
        return;
      }

      if (event.action === "map") {
        return handleResult(resolveViewRequest("map"));
      }

      if (event.action === "search") {
        return handleResult(resolveViewRequest("user-search"));
      }

      if (event.action === "messages") {
        return handleResult(resolveViewRequest("messages"));
      }

      if (event.action === "notifications") {
        return handleResult(resolveViewRequest("notifications"));
      }
    }

    // MENU
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

    // NAV
    if (event.type === "nav-item") {
      return handleResult(resolveNavRequest(event.navKey));
    }
  }

  async function handleResult(result) {
    if (!result) return;

    if (result.type === "navigate") {
      navigateTo(result.targetViewId);
      return;
    }

    if (result.type === "action") {
      await executeAction(result.actionId, {
        capabilities: getState().capabilities,
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

  function navigateTo(viewId) {
    // mapping minimale (lo raffiniamo dopo con il backup reale)
    const map = {
      home: "/pages/home-v2.html",
      following: "/pages/partecipante-seguiti-v2.html",
      map: "/pages/mappa-v2.html",
      "private-map": "/pages/mappa-privati-v2.html",
      profile: "/pages/profilo-v2.html",
      "following-users": "/pages/seguiti-utenti-v2.html",
    };

    const url = map[viewId];

    if (!url) {
      console.warn("navigation: missing mapping for", viewId);
      return;
    }

    window.location.href = url;
  }
    }
