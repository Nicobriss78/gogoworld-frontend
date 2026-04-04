import { createEventoState, setEventoError, setEventoLoading, setEventoNotFound } from "./evento-state.js";
import {
  getEventById,
  getCurrentUser,
  joinEvent,
  leaveEvent,
  openOrJoinEventRoom,
} from "./evento-api.js";
import { createEventoRenderer } from "./evento-renderer.js";

function getSearchParams() {
  return new URLSearchParams(window.location.search);
}

function readQueryValue(params, key) {
  return String(params.get(key) || "").trim();
}

function readStoredSelectedEventId() {
  try {
    return String(sessionStorage.getItem("selectedEventId") || "").trim();
  } catch {
    return "";
  }
}

function writeStoredSelectedEventId(eventId) {
  try {
    if (eventId) {
      sessionStorage.setItem("selectedEventId", eventId);
    }
  } catch {
    /* noop */
  }
}

function resolveEventId(params) {
  const fromQuery = readQueryValue(params, "id");
  if (fromQuery) return fromQuery;

  const fromStorage = readStoredSelectedEventId();
  if (fromStorage) return fromStorage;

  return "";
}

function resolveSourceContext(params) {
  return {
    fromView: readQueryValue(params, "fromView"),
    returnTo: readQueryValue(params, "returnTo"),
    returnEventId: readQueryValue(params, "returnEventId"),
  };
}

function buildReturnUrl(state) {
  const returnTo = String(state.returnTo || "").trim();
  if (!returnTo) return "";

  try {
    const url = new URL(returnTo, window.location.origin);

    if (state.returnEventId) {
      url.searchParams.set("eventId", state.returnEventId);
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function fallbackReturnUrl(state) {
  switch (String(state.fromView || "").trim()) {
    case "home":
      return "/pages/home-v2.html";
    case "following":
      return "/pages/partecipante-seguiti-v2.html";
    case "map":
      return "/pages/mappa-v2.html";
    case "private-map":
      return "/pages/mappa-privati-v2.html";
    default:
      return "";
  }
}

function navigateTo(url) {
  if (!url) return false;
  window.location.assign(url);
  return true;
}

function goBack(state) {
  const explicitReturnUrl = buildReturnUrl(state);
  if (navigateTo(explicitReturnUrl)) return;

  const fallbackUrl = fallbackReturnUrl(state);
  if (navigateTo(fallbackUrl)) return;

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.assign("/pages/home-v2.html");
}

function buildRoomNavigationUrl(roomData, state) {
  const roomId = String(roomData?.roomId || "").trim();
  if (!roomId) return "";

  const params = new URLSearchParams();
  params.set("room", roomId);

  const returnTo = buildReturnUrl(state) || fallbackReturnUrl(state) || window.location.pathname + window.location.search;
  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  return `/messages.html?${params.toString()}`;
}

function isNotFoundError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("non trovato")
  );
}

function getParticipationAction(refs) {
  return String(refs?.participationButton?.dataset?.action || "").trim();
}

async function loadEventoData(state, renderer) {
  setEventoLoading(state, true);
  state.error = "";
  state.notFound = false;
  renderer.render(state);

  if (!state.eventId) {
    setEventoNotFound(state, true);
    renderer.render(state);
    return;
  }

  try {
    const [event, currentUser] = await Promise.all([
      getEventById(state.eventId),
      getCurrentUser(),
    ]);

    state.event = event;
    state.currentUser = currentUser;
    state.error = "";
    state.notFound = false;
    state.isLoading = false;

    writeStoredSelectedEventId(state.eventId);
    renderer.render(state);
  } catch (error) {
    if (isNotFoundError(error)) {
      setEventoNotFound(state, true);
    } else {
      setEventoError(
        state,
        String(error?.message || "Impossibile caricare il dettaglio evento.")
      );
    }

    state.event = null;
    renderer.render(state);
  }
}

async function handleParticipationClick(state, renderer, refs) {
  if (!state.eventId || !state.event) return;

  const action = getParticipationAction(refs);
  if (!action) return;

  try {
    if (action === "leave") {
      state.isLeaving = true;
      renderer.render(state);

      state.event = await leaveEvent(state.eventId);
    } else {
      state.isJoining = true;
      renderer.render(state);

      state.event = await joinEvent(state.eventId);
    }

    state.error = "";
  } catch (error) {
    state.error = String(
      error?.message ||
        (action === "leave"
          ? "Impossibile lasciare l'evento."
          : "Impossibile partecipare all'evento.")
    );
  } finally {
    state.isJoining = false;
    state.isLeaving = false;
    state.isLoading = false;
    renderer.render(state);
  }
}

async function handleOpenChatClick(state, renderer) {
  if (!state.eventId) return;

  try {
    state.isOpeningChat = true;
    state.error = "";
    renderer.render(state);

    const roomData = await openOrJoinEventRoom(state.eventId);
    const roomUrl = buildRoomNavigationUrl(roomData, state);

    if (!roomUrl) {
      throw new Error("Impossibile aprire la chat evento.");
    }

    navigateTo(roomUrl);
  } catch (error) {
    state.error = String(
      error?.message || "Impossibile aprire la chat evento."
    );
    state.isOpeningChat = false;
    renderer.render(state);
    return;
  }
}

function bindUi(state, renderer) {
  const { refs } = renderer;

  if (refs.participationButton) {
    refs.participationButton.addEventListener("click", async () => {
      await handleParticipationClick(state, renderer, refs);
    });
  }

  if (refs.openChatButton) {
    refs.openChatButton.addEventListener("click", async () => {
      await handleOpenChatClick(state, renderer);
    });
  }

  if (refs.backButton) {
    refs.backButton.addEventListener("click", () => {
      goBack(state);
    });
  }

  if (refs.backFooterButton) {
    refs.backFooterButton.addEventListener("click", () => {
      goBack(state);
    });
  }
}

async function bootstrapEventoPage() {
  const params = getSearchParams();
  const state = createEventoState();
  const renderer = createEventoRenderer(document);

  state.eventId = resolveEventId(params);

  const sourceContext = resolveSourceContext(params);
  state.fromView = sourceContext.fromView;
  state.returnTo = sourceContext.returnTo;
  state.returnEventId = sourceContext.returnEventId;

  bindUi(state, renderer);
  renderer.render(state);

  await loadEventoData(state, renderer);
}

bootstrapEventoPage().catch((error) => {
  console.error("[evento-v2] bootstrap failed:", error);
});
