import { createEventoState, setEventoError, setEventoLoading, setEventoNotFound } from "./evento-state.js";
import {
  getEventById,
  getCurrentUser,
  getEventReviews,
  joinEvent,
  leaveEvent,
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
    returnEventId: readQueryValue(params, "returnEventId") || readQueryValue(params, "eventId"),
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
    case "following-v2":
      return "/pages/partecipante-seguiti-v2.html";

    case "map":
    case "map-v2":
      return "/pages/mappa-v2.html";

    case "private-map":
    case "map-private-v2":
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

function buildMessagesNavigationUrl(state) {
function isRoomsAllowedSource(state) {
  const fromView = String(state?.fromView || "").trim();

  return [
    "following",
    "following-v2",
    "following-users",
    "following-users-v2",
    "map",
    "map-v2",
    "private-map",
    "map-private-v2",
  ].includes(fromView);
}

function buildRoomsNavigationUrl(state) {
  const eventId = String(state.eventId || "").trim();
  if (!eventId) return "";

  if (!isRoomsAllowedSource(state)) {
    return "";
  }

  const params = new URLSearchParams();
  params.set("eventId", eventId);
  params.set(
    "returnTo",
    window.location.pathname + window.location.search
  );

  return `/pages/rooms.html?${params.toString()}`;
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
async function loadEventoReviews(state, renderer) {
  if (!state.eventId) return;

  try {
    state.isReviewsLoading = true;
    state.reviewsError = "";
    renderer.render(state);

    const result = await getEventReviews(state.eventId, {
      page: state.reviewsPage || 1,
      limit: state.reviewsLimit || 20,
    });

    state.reviews = Array.isArray(result.reviews) ? result.reviews : [];
    state.reviewsTotal = Number(result.total || 0);
    state.reviewsPage = Number(result.page || 1);
    state.reviewsLimit = Number(result.limit || 20);
    state.reviewsError = "";
  } catch (error) {
    state.reviews = [];
    state.reviewsTotal = 0;
    state.reviewsError = String(
      error?.message || "Impossibile caricare le recensioni dell'evento."
    );
  } finally {
    state.isReviewsLoading = false;
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

    const messagesUrl = buildMessagesNavigationUrl(state);

    if (!messagesUrl) {
      throw new Error("Impossibile aprire la chat evento.");
    }

    navigateTo(messagesUrl);
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

  if (state.event && !state.notFound && !state.error) {
    await loadEventoReviews(state, renderer);
  }
}
bootstrapEventoPage().catch(() => {
  /* bootstrap error already reflected in UI state where possible */
});
