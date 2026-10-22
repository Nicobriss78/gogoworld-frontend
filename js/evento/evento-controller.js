import { createEventoState, setEventoAccessDenied, setEventoError, setEventoLoading, setEventoNotFound } from "./evento-state.js";
import {
  getEventById,
  getCurrentUser,
  getEventReviews,
  getEventCheckInStatus,
  getEventCheckInSummary,
  getEventCheckInPrecheck,
  createEventCheckIn,
  joinEvent,
  leaveEvent,
} from "./evento-api.js";
import { requestUserPosition } from "../mappa/mappa-geo.js";
import { mountSharedGeoBanner } from "../shared/shared-geo-banner.js";
import {
  getGeoRuntimeState,
  refreshGeoPermissionState
} from "../shared/geo-runtime.js";
import { createEventoRenderer } from "./evento-renderer.js";
async function ensureGeoReminderForEvent() {
  try {
    await mountSharedGeoBanner({
      variant: "event",
      respectDismiss: false,
      anchorId: "eventoTopbar",
    });
  } catch {
    // silenzioso
  }
}
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
function clearStoredSelectedEventId(eventId) {
  try {
    const storedEventId = String(
      sessionStorage.getItem("selectedEventId") || ""
    ).trim();

    if (!eventId || storedEventId === String(eventId).trim()) {
      sessionStorage.removeItem("selectedEventId");
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
    rootReturnTo: readQueryValue(params, "rootReturnTo"),
    structuralParent: readQueryValue(params, "structuralParent"),
    returnEventId: readQueryValue(params, "returnEventId") || readQueryValue(params, "eventId"),
  };
}

function buildReturnUrl(state) {
  const structuralParent = String(state.structuralParent || "").trim();
  const rootReturnTo = String(state.rootReturnTo || "").trim();
  const target = structuralParent || rootReturnTo;
  if (!target) return "";

  try {
    const url = new URL(target, window.location.origin);

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

  window.location.assign("/pages/home-v2.html");
}
function resolveEventNavigationCoords(event) {
  const locationCoords = Array.isArray(event?.location?.coordinates)
    ? event.location.coordinates
    : null;

  if (locationCoords && locationCoords.length === 2) {
    const [lngRaw, latRaw] = locationCoords;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  const lat = Number(event?.lat);
  const lng = Number(event?.lon);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return null;
}

function openExternalNavigation(event) {
  const coords = resolveEventNavigationCoords(event);
  if (!coords) {
    throw new Error("Coordinate evento non disponibili.");
  }

  const destination = `${coords.lat},${coords.lng}`;
  const googleMapsUrl =
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

  window.location.assign(googleMapsUrl);
}
function buildRoomsNavigationUrl(state) {
  const eventId = String(state.eventId || "").trim();
  if (!eventId) return "";

  const params = new URLSearchParams();
  params.set("eventId", eventId);

  if (state.rootReturnTo) {
    params.set("rootReturnTo", state.rootReturnTo);
  }

  const structuralParent =
    window.location.pathname + window.location.search;

  if (structuralParent) {
    params.set("structuralParent", structuralParent);
  }

  return `/pages/rooms.html?${params.toString()}`;
}

function isNotFoundError(error) {
  if (Number(error?.status) === 404) return true;
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
function isPrivateEvent(event) {
  return (
    event?.isPrivate === true ||
    String(event?.visibility || "").trim().toLowerCase() === "private"
  );
}
// Status HTTP autoritativo. Il messaggio serve SOLO a scegliere la label UX.
function classifyEventAccessError(error) {
  const status = Number(error?.status || 0);
  if (status === 401) return "unauthorized";
  if (status !== 403) return "";
  const message = String(error?.message || "").toLowerCase().replace(/[’‘]/g, "'");
  return message.includes("accesso revocato dall'organizzatore") ? "revoked" : "denied";
}
function isAccessTerminal(state) {
  return ["revoked", "denied", "unauthorized"].includes(state.accessStatus);
}
function transitionEventAccess(state, renderer, error) {
  const status = classifyEventAccessError(error);
  if (!status) return false;
  setEventoAccessDenied(state, status);
  clearStoredSelectedEventId(state.eventId);
  renderer.render(state);
  return true;
}

// Un unico timer locale al dettaglio (nessun listener nel runtime Mappa/Geo).
const PRIVATE_ACCESS_POLL_MS = 25000;
function startPrivateAccessMonitor(state, renderer) {
  if (!isPrivateEvent(state.event) || isAccessTerminal(state)) return;
  let timer = null;
  let pending = false;
  let disposed = false;
  let lastAttempt = 0;
  let lifecycleVersion = 0;

  const pause = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const check = async () => {
    if (disposed || pending || document.hidden || isAccessTerminal(state) ||
        !isPrivateEvent(state.event) || state.isJoining || state.isLeaving ||
        state.isSubmittingCheckIn || state.isOpeningChat) return;
    if (Date.now() - lastAttempt < 1500) return;
    lastAttempt = Date.now();
    pending = true;
    const epoch = state.accessEpoch;
    const actionGeneration = state.actionGeneration;
    const version = lifecycleVersion;
    try {
      const event = await getEventById(state.eventId);
      if (disposed || epoch !== state.accessEpoch || isAccessTerminal(state) ||
          actionGeneration !== state.actionGeneration ||
          version !== lifecycleVersion || document.hidden) return;
      state.event = event; // Allinea la vista ai dati server soltanto dopo risposta valida.
      state.accessStatus = "ok";
      state.error = "";
      renderer.render(state);
      if (!isPrivateEvent(event)) pause();
    } catch (error) {
      if (disposed || epoch !== state.accessEpoch || isAccessTerminal(state)) return;
      if (classifyEventAccessError(error)) {
        transitionEventAccess(state, renderer, error);
        pause();
      } else if (isNotFoundError(error)) {
        state.accessEpoch += 1;
        state.event = null;
        state.accessStatus = "ok";
        setEventoNotFound(state, true);
        clearStoredSelectedEventId(state.eventId);
        renderer.render(state);
        pause();
      } else if (version === lifecycleVersion && !document.hidden) {
        // Errore temporaneo: UI cautelativamente sospesa, non e' una revoca.
        state.accessStatus = "checking_error";
        renderer.render(state);
      }
    } finally {
      pending = false;
      // Un check iniziato prima di pagehide/visibilitychange non deve
      // ritardare la rivalidazione quando la scheda torna attiva.
      if (!disposed && version !== lifecycleVersion && !document.hidden &&
          !isAccessTerminal(state)) {
        lastAttempt = 0;
        void check();
      }
    }
  };
  const resume = () => {
    if (disposed || isAccessTerminal(state) || !isPrivateEvent(state.event)) return;
    if (document.hidden) { pause(); return; }
    if (timer === null) timer = setInterval(check, PRIVATE_ACCESS_POLL_MS);
    void check();
  };
  const onVisibility = () => {
    lifecycleVersion += 1;
    if (document.hidden) pause();
    else resume();
  };
  const dispose = () => {
    disposed = true;
    pause();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
  };
  const onPageHide = (event) => {
    lifecycleVersion += 1;
    pause();
    if (!event.persisted) dispose();
  };
  const onPageShow = () => { lifecycleVersion += 1; resume(); };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  // Il caricamento iniziale e' gia' stato validato; la prima riprova e' cadenzata.
  if (!document.hidden) {
    lastAttempt = Date.now();
    timer = setInterval(check, PRIVATE_ACCESS_POLL_MS);
  }
}
function mapCheckInReasonToMessage(reasonCode) {
  const code = String(reasonCode || "").trim();

  switch (code) {
    case "ALREADY_CHECKED_IN":
      return "Check-in già effettuato, complimenti e grazie per la tua partecipazione!";
    case "INVALID_EVENT_ID":
      return "Evento non valido. Torna alla mappa e riapri l’evento.";
    case "EVENT_NOT_ACTIVE":
      return "Il check-in è disponibile solo mentre l'evento è in corso.";
    case "EVENT_HAS_NO_LOCATION":
      return "Check-in non disponibile: la posizione dell'evento non è ancora configurata.";
    case "LOCATION_REQUIRED":
      return "Check-in non effettuato. Se ti trovi sul posto, attiva la posizione e fai il check-in.";
    case "LOCATION_TOO_OLD":
      return "La posizione rilevata è troppo vecchia. Aggiornala e riprova.";
    case "LOCATION_TOO_IMPRECISE":
      return "La posizione rilevata non è abbastanza precisa per il check-in. Riprova.";
    case "OUTSIDE_RADIUS":
      return "Check-in non effettuato. Raggiungi l'evento e fai check-in.";
    case "FORBIDDEN":
      return "Non puoi effettuare il check-in per questo evento.";
    case "PERMISSION_DENIED":
      return "Check-in non effettuato. Hai negato l’accesso alla posizione: abilitalo per fare check-in.";
    case "TIMEOUT":
      return "Non riusciamo a rilevare la tua posizione in questo momento. Riprova.";
    case "UNAVAILABLE":
      return "Posizione non disponibile in questo momento. Riprova.";
    case "NOT_SUPPORTED":
      return "Il tuo browser non supporta la geolocalizzazione.";
    case "VALID":
      return "Check-in non effettuato. Risulti presente all’evento: fai check-in.";
    default:
      return "Check-in non disponibile in questo momento.";
  }
}
function buildCheckInMeta(position) {
  return {
    geoMode: "unknown",
    locationTimestamp: new Date(
      Number(position?.timestamp || Date.now())
    ).toISOString(),
  };
}

function buildCheckInPrecheckPayload(state, position) {
  return {
    eventId: state.eventId,
    position: {
      lat: Number(position?.lat),
      lng: Number(position?.lng),
      accuracy: Number(position?.accuracy),
    },
    meta: buildCheckInMeta(position),
  };
}

function resolveCheckInUxState(state) {
  const status = state.checkInStatus || null;
  const preview = state.checkInPreview || null;
  const permission = String(state.checkInPermission || "unknown").trim();

  if (status?.alreadyCheckedIn) return "checked_in";

  if (String(status?.reasonCode || "").trim() === "EVENT_HAS_NO_LOCATION") {
    return "event_location_missing";
  }

  if (status?.eventStatus === "upcoming") return "event_not_started";
  if (status?.eventStatus === "past") return "event_ended";

  if (permission === "denied") return "gps_denied";
  if (permission === "prompt" || permission === "unknown") return "gps_missing";
  if (permission === "not_supported") return "gps_not_supported";

  const previewReason = String(preview?.reasonCode || "").trim();
  if (previewReason === "OUTSIDE_RADIUS") return "outside_radius";
  if (previewReason === "VALID") return "inside_radius_ready";
  if (previewReason === "LOCATION_TOO_IMPRECISE") return "gps_imprecise";
  if (previewReason === "LOCATION_TOO_OLD") return "gps_stale";
  if (previewReason === "LOCATION_REQUIRED") return "gps_missing";
  if (previewReason === "EVENT_NOT_ACTIVE") {
    return status?.eventStatus === "past" ? "event_ended" : "event_not_started";
  }

  return "unknown";
}

async function hydrateCheckInUxState(state) {
  const epoch = state.accessEpoch;
  const stillAllowed = () => epoch === state.accessEpoch && !isAccessTerminal(state);
  const status = state.checkInStatus || null;

  if (!status) {
    state.checkInPreview = null;
    state.checkInUxState = "unknown";
    state.checkInPermission = "unknown";
    state.checkInPosition = null;
    return;
  }

  if (status.alreadyCheckedIn) {
    state.checkInPreview = null;
    state.checkInUxState = "checked_in";
    return;
  }

  if (String(status.reasonCode || "").trim() === "EVENT_HAS_NO_LOCATION") {
    state.checkInPreview = null;
    state.checkInUxState = "event_location_missing";
    return;
  }

  if (status.eventStatus === "upcoming") {
    state.checkInPreview = null;
    state.checkInUxState = "event_not_started";
    return;
  }

  if (status.eventStatus === "past") {
    state.checkInPreview = null;
    state.checkInUxState = "event_ended";
    return;
  }

await refreshGeoPermissionState().catch(() => {});
if (!stillAllowed()) return;

const permission =
  typeof navigator === "undefined" ||
  !("geolocation" in navigator)
    ? "not_supported"
    : getGeoRuntimeState().permissionState || "unknown";

state.checkInPermission = permission;

  if (permission === "denied" || permission === "prompt" || permission === "unknown" || permission === "not_supported") {
    state.checkInPreview = null;
    state.checkInPosition = null;
    state.checkInUxState = resolveCheckInUxState(state);
    return;
  }

  try {
    const position = await requestUserPosition();
    if (!stillAllowed()) return;
    state.checkInPosition = position;

    const preview = await getEventCheckInPrecheck(
      buildCheckInPrecheckPayload(state, position)
    );

    if (!stillAllowed()) return;
    state.checkInPreview = preview;
    state.checkInUxState = resolveCheckInUxState(state);
  } catch (error) {
    if (!stillAllowed()) return;
    const code = String(error?.code || error?.message || error || "").trim();

    state.checkInPreview = null;
    state.checkInUxState =
      code === "PERMISSION_DENIED"
        ? "gps_denied"
        : code === "NOT_SUPPORTED"
          ? "gps_not_supported"
          : code === "TIMEOUT"
            ? "gps_timeout"
            : code === "UNAVAILABLE"
              ? "gps_unavailable"
              : "unknown";
  }
}
function buildCheckInPayload(state, position) {
  return {
    eventId: state.eventId,
    position: {
      lat: Number(position?.lat),
      lng: Number(position?.lng),
      accuracy: Number(position?.accuracy),
    },
    source: "event_page",
    meta: buildCheckInMeta(position),
  };
}
async function loadEventoData(state, renderer) {
  const epoch = state.accessEpoch;
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
    if (epoch !== state.accessEpoch || isAccessTerminal(state)) return;
    state.event = event;
    state.currentUser = currentUser;
    state.accessStatus = "ok";
    state.error = "";
    state.notFound = false;
    state.isLoading = false;
    writeStoredSelectedEventId(state.eventId);
    renderer.render(state);
  } catch (error) {
    if (epoch !== state.accessEpoch || isAccessTerminal(state)) return;
    if (transitionEventAccess(state, renderer, error)) return;
    state.event = null;
    if (isNotFoundError(error)) {
      setEventoNotFound(state, true);
    } else {
      setEventoError(state, String(error?.message || "Impossibile caricare il dettaglio evento."));
    }
    renderer.render(state);
  }
}
async function loadEventoCheckIn(state, renderer) {
  if (!state.eventId || isAccessTerminal(state)) return;
  const epoch = state.accessEpoch;

  try {
    state.isCheckInLoading = true;
    state.checkInError = "";
    renderer.render(state);

    const [status, summary] = await Promise.all([
      getEventCheckInStatus(state.eventId),
      getEventCheckInSummary(state.eventId),
    ]);

    if (epoch !== state.accessEpoch || isAccessTerminal(state)) return;
    state.checkInStatus = status;
    state.checkInSummary = summary;
    state.checkInError = "";

    await hydrateCheckInUxState(state);
  } catch (error) {
    if (epoch !== state.accessEpoch || isAccessTerminal(state)) return;
    state.checkInStatus = null;
    state.checkInSummary = null;
    state.checkInPreview = null;
    state.checkInUxState = "unknown";
    state.checkInPermission = "unknown";
    state.checkInPosition = null;
    state.checkInError = String(
      error?.message || "Impossibile recuperare i dati del check-in."
    );
  } finally {
    if (epoch === state.accessEpoch && !isAccessTerminal(state)) {
      state.isCheckInLoading = false;
      renderer.render(state);
    }
  }
}
async function loadEventoReviews(state, renderer) {
  if (!state.eventId || isAccessTerminal(state)) return;
  const epoch = state.accessEpoch;

  try {
    state.isReviewsLoading = true;
    state.reviewsError = "";
    renderer.render(state);

    const result = await getEventReviews(state.eventId, {
      page: state.reviewsPage || 1,
      limit: state.reviewsLimit || 20,
    });

    if (epoch !== state.accessEpoch || isAccessTerminal(state)) return;
    state.reviews = Array.isArray(result.reviews) ? result.reviews : [];
    state.reviewsTotal = Number(result.total || 0);
    state.reviewsPage = Number(result.page || 1);
    state.reviewsLimit = Number(result.limit || 20);
    state.reviewsError = "";
  } catch (error) {
    if (epoch !== state.accessEpoch || isAccessTerminal(state)) return;
    state.reviews = [];
    state.reviewsTotal = 0;
    state.reviewsError = String(
      error?.message || "Impossibile caricare le recensioni dell'evento."
    );
  } finally {
    if (epoch === state.accessEpoch && !isAccessTerminal(state)) {
      state.isReviewsLoading = false;
      renderer.render(state);
    }
  }
}
async function handleParticipationClick(state, renderer, refs) {
  if (!state.eventId || !state.event || state.accessStatus !== "ok") return;
  const epoch = state.accessEpoch;

  const action = getParticipationAction(refs);
  if (!action) return;

  let shouldExitPrivateEvent = false;
  state.actionGeneration += 1;

  try {
    if (action === "leave") {
      const wasPrivateEvent = isPrivateEvent(state.event);

      state.isLeaving = true;
      renderer.render(state);

      const updated = await leaveEvent(state.eventId);
      if (epoch !== state.accessEpoch || state.accessStatus !== "ok") return;
      state.event = updated;

      if (wasPrivateEvent) {
        clearStoredSelectedEventId(state.eventId);
        shouldExitPrivateEvent = true;
      }
    } else {
      state.isJoining = true;
      renderer.render(state);

      const updated = await joinEvent(state.eventId);
      if (epoch !== state.accessEpoch || state.accessStatus !== "ok") return;
      state.event = updated;
    }

    state.error = "";
  } catch (error) {
    if (epoch !== state.accessEpoch || isAccessTerminal(state)) return;
    state.error = String(
      error?.message ||
        (action === "leave"
          ? "Impossibile lasciare l'evento."
          : "Impossibile partecipare all'evento.")
    );
  } finally {
    if (epoch !== state.accessEpoch || isAccessTerminal(state)) return;
    state.actionGeneration += 1;
    state.isJoining = false;
    state.isLeaving = false;
    state.isLoading = false;

    if (shouldExitPrivateEvent) {
      goBack(state);
    } else {
      renderer.render(state);
    }
  }
}
async function handleCheckInClick(state, renderer) {
  if (!state.eventId || !state.event || state.accessStatus !== "ok") return;
  const epoch = state.accessEpoch;
  const stillAllowed = () => epoch === state.accessEpoch && state.accessStatus === "ok";

  try {
    state.isSubmittingCheckIn = true;
    state.checkInError = "";
    renderer.render(state);

    const position = await requestUserPosition();
    if (!stillAllowed()) return;
    state.checkInPermission = "granted";
    state.checkInPosition = position;

    const preview = await getEventCheckInPrecheck(
      buildCheckInPrecheckPayload(state, position)
    );

    if (!stillAllowed()) return;
    state.checkInPreview = preview;
    state.checkInUxState = resolveCheckInUxState(state);
    renderer.render(state);

    if (!preview?.canCheckIn || String(preview?.reasonCode || "").trim() !== "VALID") {
      state.checkInError = mapCheckInReasonToMessage(preview?.reasonCode);
      return;
    }

    const payload = buildCheckInPayload(state, position);
    const result = await createEventCheckIn(payload);
    if (!stillAllowed()) return;

    const [status, summary] = await Promise.all([
      getEventCheckInStatus(state.eventId),
      Promise.resolve(result.summary || null),
    ]);

    if (!stillAllowed()) return;
    state.checkInStatus = status;
    state.checkInSummary = summary || state.checkInSummary;
    state.checkInPreview = preview;
    state.checkInUxState = resolveCheckInUxState(state);
    state.checkInError = "";
  } catch (error) {
    if (!stillAllowed()) return;
    const errorCode = String(error?.code || error?.message || error || "").trim();

    if (errorCode === "PERMISSION_DENIED") {
      state.checkInPermission = "denied";
      state.checkInUxState = "gps_denied";
    } else if (errorCode === "NOT_SUPPORTED") {
      state.checkInPermission = "not_supported";
      state.checkInUxState = "gps_not_supported";
    } else if (errorCode === "TIMEOUT") {
      state.checkInUxState = "gps_timeout";
    } else if (errorCode === "UNAVAILABLE") {
      state.checkInUxState = "gps_unavailable";
    }

    state.checkInError = mapCheckInReasonToMessage(errorCode);
  } finally {
    if (stillAllowed()) {
      state.isSubmittingCheckIn = false;
      renderer.render(state);
    }
  }
}
async function handleNavigateClick(state, renderer) {
  if (!state.event || state.accessStatus !== "ok") return;

  try {
    state.error = "";
    renderer.render(state);

    openExternalNavigation(state.event);
  } catch (error) {
    state.error = String(
      error?.message || "Impossibile avviare la navigazione verso l’evento."
    );
    renderer.render(state);
  }
}
async function handleOpenChatClick(state, renderer) {
  if (!state.eventId || !state.event || state.accessStatus !== "ok") return;

  try {
    state.isOpeningChat = true;
    state.error = "";
    renderer.render(state);

    const roomsUrl = buildRoomsNavigationUrl(state);

    if (!roomsUrl) {
      throw new Error("Impossibile aprire la chat evento.");
    }

    navigateTo(roomsUrl);
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

  if (refs.checkInButton) {
    refs.checkInButton.addEventListener("click", async () => {
      await handleCheckInClick(state, renderer);
    });
  }

  if (refs.navigateButton) {
    refs.navigateButton.addEventListener("click", async () => {
      await handleNavigateClick(state, renderer);
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
  state.rootReturnTo = sourceContext.rootReturnTo;
  state.structuralParent = sourceContext.structuralParent;
  state.returnEventId = sourceContext.returnEventId;

  bindUi(state, renderer);
  renderer.render(state);

 await loadEventoData(state, renderer);
 if (state.event && isPrivateEvent(state.event) && state.accessStatus === "ok") {
   startPrivateAccessMonitor(state, renderer);
 }

if (
  state.event &&
  !state.notFound &&
  !state.error
) {
  await ensureGeoReminderForEvent();

  await loadEventoCheckIn(
    state,
    renderer
  );

  await loadEventoReviews(
    state,
    renderer
  );
}
}
bootstrapEventoPage().catch(() => {
  /* bootstrap error already reflected in UI state where possible */
});
