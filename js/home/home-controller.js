/**
 * GoGoWorld.life — HOME vNext Controller
 * Controller dedicato della nuova Home.
 * Solo logica Home: stato, split eventi, rendering, rail mode,
 * banner engine, autofocus, scrollbars, delegation.
 */

import {
  createEventCard,
  createSwitchCard,
  createDirectionalBridgeCard,
  createBannerSlot,
  createStateBlock,
  renderRail,
} from "./home-renderer.js";

import { createBannerEngine } from "./home-banners.js";
/* =========================================================
   CONFIG
   ========================================================= */

const HOME_CONFIG = {
  generalPastPreviewLimit: 10,
  joinedPastPreviewLimit: 15,
  bannerRotationInterval: 8000,
  detailsIcon: "info",
  showCloseDetail: false,
};

/* =========================================================
   FALLBACK TIPS
   ========================================================= */

const HOME_FALLBACK_TIPS = [
  {
    id: "geo",
    title: "Esplora gli eventi vicini",
    text: "Apri la mappa e scopri cosa succede intorno a te.",
  },
  {
    id: "follow",
    title: "Segui le persone e gli organizzatori",
    text: "Costruisci il tuo flusso di eventi partendo da chi segui.",
  },
  {
    id: "checkin",
    title: "Partecipa e resta aggiornato",
    text: "Controlla i tuoi eventi attivi e tieni d’occhio quelli passati.",
  },
];

/* =========================================================
   API ADAPTER
   Sostituisci qui solo se i tuoi endpoint reali differiscono.
   ========================================================= */

async function fetchHomePayload() {
  const token = localStorage.getItem("token");

  const meRes = await apiGet("/users/me", token);
  const currentUserId =
    meRes?._id ||
    meRes?.id ||
    meRes?.user?._id ||
    meRes?.user?.id ||
    null;

  const meCountry =
    (meRes?.country || meRes?.user?.country || "").trim() || null;

  const meRegion =
    (meRes?.region || meRes?.user?.region || "").trim() || null;

  const evRes = await apiGet("/events", token);
  const events = Array.isArray(evRes?.events) ? evRes.events : [];

  let banners = [];
  try {
    const bannerRes = await getActiveBannersBatch(
      {
        placement: "events_list_inline",
        country: meCountry,
        region: meRegion,
        limit: 8,
      },
      token
    );

    banners = Array.isArray(bannerRes?.data) ? bannerRes.data : [];
  } catch {
    banners = [];
  }

  return {
    events,
    banners,
    tips: HOME_FALLBACK_TIPS,
    currentUserId,
    currentUserCountry: meCountry,
    currentUserRegion: meRegion,
  };
}

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
   HELPERS DATA
   ========================================================= */

function toTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function getEventStatus(event) {
  return String(event?.status ?? "").trim().toLowerCase();
}

function isActiveStatus(status) {
  return status === "future" || status === "imminent" || status === "ongoing";
}

function isPastStatus(status) {
  return status === "concluded" || status === "past";
}

function isActiveEvent(event) {
  return isActiveStatus(getEventStatus(event));
}

function isPastEvent(event) {
  return isPastStatus(getEventStatus(event));
}
function isConcludedEvent(event) {
  return getEventStatus(event) === "concluded";
}

function isArchivedPastEvent(event) {
  return getEventStatus(event) === "past";
}

function sortPastEventsForHome(events = []) {
  const concluded = [];
  const archived = [];

  for (const event of events) {
    if (isConcludedEvent(event)) {
      concluded.push(event);
      continue;
    }

    if (isArchivedPastEvent(event)) {
      archived.push(event);
      continue;
    }

    archived.push(event);
  }

  return [
    ...sortEventsDescending(concluded),
    ...sortEventsDescending(archived),
  ];
}
function sortEventsAscending(events = []) {
  return [...events].sort((a, b) => {
    const aTime =
      toTime(a?.dateStart ?? a?.startDate ?? a?.date ?? a?.createdAt) ?? Number.MAX_SAFE_INTEGER;
    const bTime =
      toTime(b?.dateStart ?? b?.startDate ?? b?.date ?? b?.createdAt) ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function sortEventsDescending(events = []) {
  return [...events].sort((a, b) => {
    const aTime =
      toTime(a?.dateEnd ?? a?.endDate ?? a?.dateStart ?? a?.startDate ?? a?.date ?? a?.createdAt) ?? 0;
    const bTime =
      toTime(b?.dateEnd ?? b?.endDate ?? b?.dateStart ?? b?.startDate ?? b?.date ?? b?.createdAt) ?? 0;
    return bTime - aTime;
  });
}

function normalizeComparableId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return String(
      value?._id ??
      value?.id ??
      value?.userId ??
      value?.user?._id ??
      value?.user?.id ??
      ""
    ).trim();
  }
  return String(value).trim();
}

function isJoinedByCurrentUser(event, currentUserId) {
  const currentId = normalizeComparableId(currentUserId);
  if (!currentId) return false;

  const participants = Array.isArray(event?.participants) ? event.participants : [];
  const attendees = Array.isArray(event?.attendees) ? event.attendees : [];
  const list = participants.length ? participants : attendees;

  return list.some((item) => normalizeComparableId(item) === currentId);
}

function splitEvents(events = [], currentUserId = null) {
  const joined = [];
  const general = [];

  for (const event of events) {
    if (isJoinedByCurrentUser(event, currentUserId)) {
      joined.push(event);
    } else {
      general.push(event);
    }
  }

  const generalActive = sortEventsAscending(
    general.filter((event) => isActiveEvent(event))
  );

  const generalPast = sortPastEventsForHome(
    general.filter((event) => isPastEvent(event))
  );

  const joinedActive = sortEventsAscending(
    joined.filter((event) => isActiveEvent(event))
  );

  const joinedPast = sortPastEventsForHome(
    joined.filter((event) => isPastEvent(event))
  );

  const generalHotPast = generalPast.filter((event) => isConcludedEvent(event));
  const joinedHotPast = joinedPast.filter((event) => isConcludedEvent(event));

  return {
    generalActive,
    generalPast,
    joinedActive,
    joinedPast,
    generalHotPast,
    joinedHotPast,
    hasHotGeneralPast: generalHotPast.length > 0,
    hasHotJoinedPast: joinedHotPast.length > 0,
  };
}

/* =========================================================
   BANNER SLOT INJECTION
   ========================================================= */

function injectBannerSlots(events = []) {
  const result = [];
  let slotIndex = 0;

  events.forEach((event, index) => {
    result.push({ type: "event", data: event });

    const isAfterFirst = index === 0;
    const isEveryTwoAfter = index > 0 && (index + 1) % 2 === 1;

    if (isAfterFirst || isEveryTwoAfter) {
      result.push({ type: "banner-slot", slotIndex });
      slotIndex += 1;
    }
  });

  return result;
}

/* =========================================================
   NODES BUILDERS
   ========================================================= */
function createHotPastDirectionalCard(scope = "general") {
  if (scope === "joined") {
    return createDirectionalBridgeCard({
      scope: "joined",
      leftTitle: "Eventi appena conclusi",
      leftText: "Scorri a sinistra per chat e recensioni ancora disponibili.",
      rightTitle: "Eventi attivi",
      rightText: "Scorri a destra per continuare con i tuoi eventi correnti.",
    });
  }

  return createDirectionalBridgeCard({
    scope: "general",
    leftTitle: "Eventi appena conclusi",
    leftText: "Scorri a sinistra per raggiungere gli eventi con chat ancora attiva.",
    rightTitle: "Eventi attivi",
    rightText: "Scorri a destra per esplorare gli eventi attualmente disponibili.",
  });
}
function buildGeneralActiveNodes(
  events = [],
  pastCount = 0,
  { hasHotPast = false } = {}
) {
  const nodes = [];

  if (hasHotPast) {
    nodes.push(createHotPastDirectionalCard("general"));
  } else if (pastCount > 0) {
    nodes.push(
      createSwitchCard({
        direction: "to-past",
        count: pastCount,
        title: "Rivedi gli eventi passati",
        subtitle: "Apri l’archivio recente degli eventi già conclusi.",
        buttonLabel: "Apri archivio",
      })
    );
  }

  const injected = injectBannerSlots(events);

  injected.forEach((item) => {
    if (item.type === "banner-slot") {
      nodes.push(createBannerSlot(item.slotIndex));
      return;
    }

    nodes.push(
      createEventCard(item.data, {
        detailsIcon: HOME_CONFIG.detailsIcon,
        showClose: HOME_CONFIG.showCloseDetail,
      })
    );
  });

  return nodes;
}

function buildGeneralPastNodes(events = []) {
  const nodes = [];

  nodes.push(
    createSwitchCard({
      direction: "to-active",
      title: "Torna agli eventi attivi",
      subtitle: "Rientra nella vista principale degli eventi disponibili.",
      buttonLabel: "Torna agli attivi",
    })
  );

  events.forEach((event) => {
    nodes.push(
      createEventCard(event, {
        detailsIcon: HOME_CONFIG.detailsIcon,
        showClose: HOME_CONFIG.showCloseDetail,
      })
    );
  });

  return nodes;
}

function buildJoinedActiveNodes(activeEvents = [], pastCount = 0) {
  const nodes = [];

  if (pastCount > 0) {
    nodes.push(
      createSwitchCard({
        direction: "to-past",
        count: pastCount,
        title: "Rivedi i tuoi eventi passati",
        subtitle: "Apri l’archivio recente degli eventi a cui hai partecipato.",
        buttonLabel: "Apri archivio",
      })
    );
  }

  activeEvents.forEach((event) => {
    nodes.push(
      createEventCard(event, {
        detailsIcon: HOME_CONFIG.detailsIcon,
        showClose: HOME_CONFIG.showCloseDetail,
      })
    );
  });

  return nodes;
}

function buildJoinedPastNodes(events = []) {
  const nodes = [];

  nodes.push(
    createSwitchCard({
      direction: "to-active",
      title: "Torna ai tuoi eventi attivi",
      subtitle: "Rientra nella vista principale dei tuoi eventi correnti.",
      buttonLabel: "Torna agli attivi",
    })
  );

  events.forEach((event) => {
    nodes.push(
      createEventCard(event, {
        detailsIcon: HOME_CONFIG.detailsIcon,
        showClose: HOME_CONFIG.showCloseDetail,
      })
    );
  });

  return nodes;
}

/* =========================================================
   EMPTY / ERROR / LOADING
   ========================================================= */

function renderLoading(dom) {
  renderRail(dom.generalActiveRail, [
    createStateBlock({
      title: "Caricamento Home",
      text: "Sto preparando i contenuti principali della tua Home.",
    }),
  ]);

  renderRail(dom.generalPastRail, []);
  renderRail(dom.joinedActiveRail, []);
  renderRail(dom.joinedPastRail, []);
}

function renderError(dom, message) {
  renderRail(dom.generalActiveRail, [
    createStateBlock({
      type: "error",
      title: "Errore",
      text: message,
    }),
  ]);

  renderRail(dom.generalPastRail, []);
  renderRail(dom.joinedActiveRail, []);
  renderRail(dom.joinedPastRail, []);
}

function buildEmptyGeneralNodes() {
  return [
    createStateBlock({
      title: "Nessun evento disponibile",
      text: "Al momento non ci sono eventi generali da mostrarti.",
    }),
  ];
}

function buildEmptyJoinedNodes() {
  return [
    createStateBlock({
      title: "Nessun evento seguito",
      text: "Quando parteciperai a un evento, lo troverai qui.",
    }),
  ];
}

/* =========================================================
   RAIL MODE
   ========================================================= */

function setRailMode(shell, mode) {
  if (!shell) return;
  shell.dataset.railMode = mode === "past" ? "past" : "active";
}

function bindRailModeDelegation(dom) {
  dom.root.addEventListener("click", (event) => {
    const actionNode = event.target.closest("[data-home-action]");
    if (!actionNode) return;

    const action = actionNode.dataset.homeAction;

    if (action === "show-past") {
      const shell = actionNode.closest(".home-rail-shell");
      setRailMode(shell, "past");
      resetRailScrollForMode(shell, "past");
    }

    if (action === "show-active") {
      const shell = actionNode.closest(".home-rail-shell");
      setRailMode(shell, "active");
      resetRailScrollForMode(shell, "active");
    }
  });
}

function getVisibleRailAndScrollbar(shell, dom) {
  if (!shell) return null;

  if (shell === dom.generalShell) {
    return shell.dataset.railMode === "past"
      ? { rail: dom.generalPastRail, scrollbar: dom.generalPastScrollbar }
      : { rail: dom.generalActiveRail, scrollbar: dom.generalActiveScrollbar };
  }

  if (shell === dom.joinedShell) {
    return shell.dataset.railMode === "past"
      ? { rail: dom.joinedPastRail, scrollbar: dom.joinedPastScrollbar }
      : { rail: dom.joinedActiveRail, scrollbar: dom.joinedActiveScrollbar };
  }

  return null;
}

function resetRailScrollForMode(shell, mode) {
  const rail =
    mode === "past"
      ? shell.querySelector(".home-rail--past")
      : shell.querySelector(".home-rail--active");

  if (rail) {
    rail.scrollTo({ left: 0, behavior: "smooth" });
  }
}

/* =========================================================
   SCROLLBAR CUSTOM
   ========================================================= */

function attachScrollbar(rail, scrollbar) {
  if (!rail || !scrollbar) return;

  const thumb = scrollbar.querySelector(".home-scrollbar-thumb");
  if (!thumb) return;

  let isDragging = false;
  let dragStartX = 0;
  let startScrollLeft = 0;

  function updateThumb() {
    const maxScroll = rail.scrollWidth - rail.clientWidth;

    if (maxScroll <= 0) {
      thumb.style.width = "100%";
      rail.style.scrollSnapType = "none";
      scrollbar.style.opacity = "0.45";
      thumb.style.setProperty("--home-scrollbar-x", "0px");
      thumb.style.transform = "translateX(0px)";
      return;
    }

    rail.style.scrollSnapType = "x mandatory";
    scrollbar.style.opacity = "1";

    const ratio = rail.clientWidth / rail.scrollWidth;
    const thumbWidth = Math.max(scrollbar.clientWidth * ratio, 36);
    const maxThumbX = scrollbar.clientWidth - thumbWidth;
    const scrollRatio = rail.scrollLeft / maxScroll;
    const thumbX = maxThumbX * scrollRatio;

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translateX(${thumbX}px)`;
  }

  rail.addEventListener("scroll", updateThumb, { passive: true });
  window.addEventListener("resize", updateThumb);

  scrollbar.addEventListener("pointerdown", (event) => {
    isDragging = true;
    dragStartX = event.clientX;
    startScrollLeft = rail.scrollLeft;
    scrollbar.classList.add("is-dragging");
    scrollbar.setPointerCapture?.(event.pointerId);
  });

  scrollbar.addEventListener("pointermove", (event) => {
    if (!isDragging) return;

    const maxScroll = rail.scrollWidth - rail.clientWidth;
    if (maxScroll <= 0) return;

    const thumbWidth = thumb.offsetWidth || 1;
    const trackWidth = scrollbar.clientWidth - thumbWidth || 1;
    const deltaX = event.clientX - dragStartX;
    const scrollDelta = (deltaX / trackWidth) * maxScroll;

    rail.scrollLeft = startScrollLeft + scrollDelta;
  });

  function stopDragging(event) {
    if (!isDragging) return;
    isDragging = false;
    scrollbar.classList.remove("is-dragging");
    if (event?.pointerId != null) {
      scrollbar.releasePointerCapture?.(event.pointerId);
    }
  }

  scrollbar.addEventListener("pointerup", stopDragging);
  scrollbar.addEventListener("pointercancel", stopDragging);

  requestAnimationFrame(updateThumb);
}

/* =========================================================
   AUTOFOCUS
   ========================================================= */

function autoFocusFirstRealEvent(rail) {
  if (!rail) return;

  const firstEventCard = rail.querySelector(".home-card[data-event-id]");
  if (!firstEventCard) return;

  const railRect = rail.getBoundingClientRect();
  const cardRect = firstEventCard.getBoundingClientRect();
  const offset = cardRect.left - railRect.left + rail.scrollLeft;

  rail.scrollTo({
    left: offset,
    behavior: "smooth",
  });
}

/* =========================================================
   CARD ACTIONS
   ========================================================= */

function bindCardActions(dom) {
  dom.root.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-home-action]");
    const card = event.target.closest(".home-card");
    const eventId = card?.dataset?.eventId ?? "";

    if (actionButton) {
      const action = actionButton.dataset.homeAction;

      if (action === "details" && eventId) {
        window.location.href = `/evento.html?id=${encodeURIComponent(eventId)}`;
      }

      if (action === "close-detail" && eventId) {
        console.log("[HOME] close-detail", eventId);
      }

      return;
    }

    if (card && eventId) {
      console.log("[HOME] card-click", eventId);
    }
  });
}

/* =========================================================
   BANNERS
   ========================================================= */

function setupBannerEngine(dom, banners = [], tips = []) {
  const engine = createBannerEngine({
    rotationInterval: HOME_CONFIG.bannerRotationInterval,
  });

  const allSlots = dom.generalActiveRail.querySelectorAll(".home-banner-slot");

  engine.bindSlots(allSlots);
  engine.setData({ banners, tips });
  engine.fillInitial();
  engine.start();

  return engine;
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

function renderHome(dom, payload) {
  const split = splitEvents(payload.events, payload.currentUserId);
  console.log("[HOME] currentUserId:", payload.currentUserId);
  console.log("[HOME] total events:", Array.isArray(payload.events) ? payload.events.length : 0);
  console.log("[HOME] generalActive:", split.generalActive.length);
  console.log("[HOME] generalPast:", split.generalPast.length);
  console.log("[HOME] generalHotPast:", split.generalHotPast.length);
  console.log("[HOME] hasHotGeneralPast:", split.hasHotGeneralPast);
  console.log("[HOME] joinedActive:", split.joinedActive.length);
  console.log("[HOME] joinedPast:", split.joinedPast.length);
  console.log("[HOME] joinedHotPast:", split.joinedHotPast.length);
  console.log("[HOME] hasHotJoinedPast:", split.hasHotJoinedPast);
const generalActiveNodes = split.generalActive.length || split.generalPast.length
    ? buildGeneralActiveNodes(split.generalActive, split.generalPast.length)
    : buildEmptyGeneralNodes();

  const generalPastPreview = split.generalPast.slice(
    0,
    HOME_CONFIG.generalPastPreviewLimit
  );

  const generalPastNodes = generalPastPreview.length
    ? buildGeneralPastNodes(generalPastPreview)
    : buildEmptyGeneralNodes();

  const joinedPastPreview = split.joinedPast.slice(
    0,
    HOME_CONFIG.joinedPastPreviewLimit
  );

  const joinedActiveNodes = split.joinedActive.length || joinedPastPreview.length
    ? buildJoinedActiveNodes(split.joinedActive, split.joinedPast.length)
    : buildEmptyJoinedNodes();

  const joinedPastNodes = joinedPastPreview.length
    ? buildJoinedPastNodes(joinedPastPreview)
    : buildEmptyJoinedNodes();

  renderRail(dom.generalActiveRail, generalActiveNodes);
  renderRail(dom.generalPastRail, generalPastNodes);
  renderRail(dom.joinedActiveRail, joinedActiveNodes);
  renderRail(dom.joinedPastRail, joinedPastNodes);

  setRailMode(dom.generalShell, "active");
  setRailMode(dom.joinedShell, "active");

  attachScrollbar(dom.generalActiveRail, dom.generalActiveScrollbar);
  attachScrollbar(dom.generalPastRail, dom.generalPastScrollbar);
  attachScrollbar(dom.joinedActiveRail, dom.joinedActiveScrollbar);
  attachScrollbar(dom.joinedPastRail, dom.joinedPastScrollbar);

  requestAnimationFrame(() => {
    autoFocusFirstRealEvent(dom.generalActiveRail);
    autoFocusFirstRealEvent(dom.joinedActiveRail);
  });

  const bannerEngine = setupBannerEngine(
    dom,
    payload.banners,
    payload.tips?.length ? payload.tips : HOME_FALLBACK_TIPS
  );

  return { bannerEngine };
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
