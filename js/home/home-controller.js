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
import { gwNotify } from "../utils.js";
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
