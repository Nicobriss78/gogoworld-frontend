import {
  createEventCard,
  createSwitchCard,
  createDirectionalBridgeCard,
  createBannerSlot,
  createStateBlock,
  renderRail,
} from "./home-renderer.js";
import { createBannerEngine } from "./home-banners.js";
import { splitEvents } from "./home-data.js";
import { HOME_CONFIG } from "./home-state.js";

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

function createHotPastDirectionalCard(scope = "general") {
  if (scope === "joined") {
    return createDirectionalBridgeCard({
      scope: "joined",
      leftTitle: "Appena conclusi",
      leftText: "A sinistra trovi chat e recensioni ancora disponibili.",
      rightTitle: "Eventi attivi",
      rightText: "A destra torni subito ai tuoi eventi in corso.",
    });
  }

  return createDirectionalBridgeCard({
    scope: "general",
    leftTitle: "Appena conclusi",
    leftText: "A sinistra trovi gli eventi con chat ancora attiva.",
    rightTitle: "Eventi attivi",
    rightText: "A destra torni subito agli eventi disponibili.",
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

function buildJoinedActiveNodes(
  activeEvents = [],
  pastCount = 0,
  { hasHotPast = false } = {}
) {
  const nodes = [];

  if (hasHotPast) {
    nodes.push(createHotPastDirectionalCard("joined"));
  } else if (pastCount > 0) {
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

export function renderLoading(dom) {
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

export function renderError(dom, message) {
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

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function getSmoothScrollBehavior() {
  return prefersReducedMotion() ? "auto" : "smooth";
}

export function scrollRailTo(rail, left) {
  if (!rail) return;

  rail.scrollTo({
    left,
    behavior: getSmoothScrollBehavior(),
  });
}

export function setRailMode(shell, mode) {
  if (!shell) return;
  shell.dataset.railMode = mode === "past" ? "past" : "active";
}

export function resetRailScrollForMode(shell, mode) {
  const rail =
    mode === "past"
      ? shell.querySelector(".home-rail--past")
      : shell.querySelector(".home-rail--active");

  scrollRailTo(rail, 0);
}

export function attachScrollbar(rail, scrollbar) {
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

export function hasDirectionalBridgeCard(rail) {
  if (!rail) return false;

  return Boolean(
    rail.querySelector(
      '.home-directional-card[data-home-card-type="directional-bridge"]'
    )
  );
}

export function autoFocusFirstRealEvent(rail) {
  if (!rail) return;

  if (hasDirectionalBridgeCard(rail)) {
    rail.scrollLeft = 0;
    return;
  }

  const target = rail.querySelector(".home-card[data-event-id]");
  if (!target) return;

  const railRect = rail.getBoundingClientRect();
  const cardRect = target.getBoundingClientRect();
  const offset = cardRect.left - railRect.left + rail.scrollLeft;

  scrollRailTo(rail, offset);
}

export function setupBannerEngine(dom, banners = [], tips = []) {
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

export function renderHomeView(dom, payload) {
  const split = splitEvents(payload.events, payload.currentUserId);

  const generalActiveNodes = split.generalActive.length || split.generalPast.length
    ? buildGeneralActiveNodes(split.generalActive, split.generalPast.length, {
        hasHotPast: split.hasHotGeneralPast,
      })
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
    ? buildJoinedActiveNodes(split.joinedActive, split.joinedPast.length, {
        hasHotPast: split.hasHotJoinedPast,
      })
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
    payload.tips || []
  );

  requestAnimationFrame(() => {
    if (hasDirectionalBridgeCard(dom.generalActiveRail)) {
      dom.generalActiveRail.scrollLeft = 0;
    }

    if (hasDirectionalBridgeCard(dom.joinedActiveRail)) {
      dom.joinedActiveRail.scrollLeft = 0;
    }
  });

  return { bannerEngine };
}
export function bindRailModeDelegation(dom) {
  const shells = [dom.generalShell, dom.joinedShell];

  shells.forEach((shell) => {
    if (!shell) return;

    shell.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-home-switch]");
      if (!btn) return;

      const direction = btn.dataset.homeSwitch;

      if (direction === "to-past") {
        setRailMode(shell, "past");
        resetRailScrollForMode(shell, "past");
      }

      if (direction === "to-active") {
        setRailMode(shell, "active");
        resetRailScrollForMode(shell, "active");
      }
    });
  });
}

export function bindCardActions(dom) {
  const root = document;

  root.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-home-action]");
    if (!btn) return;

    const action = btn.dataset.homeAction;
    const eventId = btn.dataset.eventId;

    if (action === "details" && eventId) {
  window.location.href =
    `/pages/evento-v2.html?id=${encodeURIComponent(eventId)}` +
    `&fromView=home` +
    `&returnTo=${encodeURIComponent("/pages/home-v2.html")}`;
}
  });
}
