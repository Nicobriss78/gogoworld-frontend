import {
  resolveUserIdentity,
  applyUserIdentityToTopbar,
} from "../shared/user-identity.js";
import {
  createSeguitiBannerEngine,
  createSeguitiBannerSlot,
} from "./seguiti-banners.js";
import {
  fetchFollowingEvents,
  fetchFollowingBanners,
  joinSeguitiEvent,
} from "./seguiti-api.js";
import {
  normalizeEvents,
  groupByOrganizer,
} from "./seguiti-renderer.js";
const ACTIVE_STATUSES = new Set(["future", "imminent", "ongoing"]);
const PAST_STATUSES = new Set(["concluded", "past"]);

const STATUS_LABELS = {
  future: "In arrivo",
  imminent: "Imminente",
  ongoing: "In corso",
  concluded: "Concluso da poco",
  past: "Passato",
};

const NAV_KEY = "following-events";

function getRefs(root = document) {
  return {
    root,
    greeting: root.getElementById("seguitiGreeting"),
    role: root.getElementById("seguitiRole"),
    loading: root.getElementById("seguitiLoadingState"),
    sections: root.getElementById("seguitiSections"),
    empty: root.getElementById("seguitiEmptyState"),
    error: root.getElementById("seguitiErrorState"),
    errorText: root.getElementById("seguitiErrorText"),
    retryBtn: root.getElementById("seguitiRetryBtn"),
    organizerTpl: root.getElementById("seguitiOrganizerSectionTemplate"),
    cardTpl: root.getElementById("seguitiCardTemplate"),
    bottomnav: root.querySelector(".seguiti-bottomnav"),  };
}

const seguitiState = {
  rawEvents: [],
  normalizedEvents: [],
  organizerSections: [],
  loading: false,
  error: null,
  initialized: false,
  activeSectionIndex: 0,
  bannerEngine: null,
};
let currentUserId = null;
let currentUserProfile = null;
async function setTopbarIdentity(refs) {
  const identity = await resolveUserIdentity();

  currentUserProfile = identity?.raw || null;

  currentUserId =
    identity?.raw?._id ||
    identity?.raw?.id ||
    identity?._id ||
    identity?.id ||
    null;

  applyUserIdentityToTopbar({
    greetingEl: refs.greeting,
    roleEl: refs.role,
    identity,
  });
}

function showOnly(refs, key) {
  const map = {
    loading: refs.loading,
    sections: refs.sections,
    empty: refs.empty,
    error: refs.error,
  };

  Object.entries(map).forEach(([k, el]) => {
    if (!el) return;
    if (k === key) el.hidden = false;
    else el.hidden = true;
  });
}

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

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function getSmoothScrollBehavior() {
  return prefersReducedMotion() ? "auto" : "smooth";
}

function scrollRailTo(rail, left) {
  if (!rail) return;

  rail.scrollTo({
    left,
    behavior: getSmoothScrollBehavior(),
  });
}
function formatDateRange(dateStart, dateEnd) {
  if (!dateStart) return "Data da definire";
  const start = new Date(dateStart);
  const end = dateEnd ? new Date(dateEnd) : null;

  if (Number.isNaN(start.getTime())) return "Data da definire";

  const dateFmt = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timeFmt = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const startDate = dateFmt.format(start);
  const startTime = timeFmt.format(start);

  if (!end || Number.isNaN(end.getTime())) {
    return `${startDate} • ${startTime}`;
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    return `${startDate} • ${startTime}–${timeFmt.format(end)}`;
  }

  return `${startDate} → ${dateFmt.format(end)}`;
}

function formatPlace(event) {
  const parts = [event.city, event.region, event.country].filter(Boolean);
  return parts.length ? parts.join(" • ") : "Luogo da definire";
}

function formatCategory(event) {
  const parts = [event.category, event.subcategory].filter(Boolean);
  return parts.length ? parts.join(" • ") : "Categoria non specificata";
}

function formatPrice(event) {
  if (event.isFree) return "Gratuito";
  if (typeof event.price === "number" && Number.isFinite(event.price)) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: event.currency || "EUR",
      maximumFractionDigits: event.price % 1 === 0 ? 0 : 2,
    }).format(event.price);
  }
  return "Prezzo da definire";
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || "Evento";
}

function getFallbackImage() {
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#e9f4fb"/>
          <stop offset="100%" stop-color="#d7e9f4"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)"/>
      <circle cx="180" cy="120" r="46" fill="#3F7C96" fill-opacity="0.15"/>
      <rect x="120" y="210" width="400" height="18" rx="9" fill="#3F7C96" fill-opacity="0.16"/>
      <rect x="160" y="240" width="320" height="14" rx="7" fill="#3F7C96" fill-opacity="0.12"/>
    </svg>
  `);
}

function createCard(refs, event) {
  const fragment = refs.cardTpl.content.cloneNode(true);
  const card = fragment.querySelector(".seguiti-card");
  const surface = fragment.querySelector('[data-action="open-detail"]');
  const actionBtn = fragment.querySelector('[data-action="join-event"]');
  const img = fragment.querySelector(".seguiti-card__thumb");
  const badge = fragment.querySelector(".seguiti-card__status-badge");
  const title = fragment.querySelector(".seguiti-card__title");
  const dateField = fragment.querySelector('[data-field="date"]');
  const placeField = fragment.querySelector('[data-field="place"]');
  const categoryField = fragment.querySelector('[data-field="category"]');
  const price = fragment.querySelector(".seguiti-card__price");

  card.dataset.eventId = event._id;
  surface.dataset.eventId = event._id;
  actionBtn.dataset.eventId = event._id;

  title.textContent = event.title;
  badge.textContent = getStatusLabel(event.status);
  dateField.textContent = formatDateRange(event.dateStart, event.dateEnd);
  placeField.textContent = formatPlace(event);
  categoryField.textContent = formatCategory(event);
  price.textContent = formatPrice(event);

  img.src = event.coverImage || getFallbackImage();
  img.alt = `Copertina evento ${event.title}`;
  img.addEventListener(
    "error",
    () => {
      img.src = getFallbackImage();
    },
    { once: true }
  );

  if (event.joined || PAST_STATUSES.has(event.status)) {
    actionBtn.textContent = event.joined ? "✅ Partecipo" : "Evento concluso";
    actionBtn.classList.add(event.joined ? "is-joined" : "is-busy");
    actionBtn.disabled = true;
  } else {
    actionBtn.textContent = "Partecipa";
    actionBtn.disabled = false;
  }

  return fragment;
}

function updateRailEmpty(sectionEl, mode, hasItems) {
  const empty = sectionEl.querySelector(`.seguiti-rail-empty[data-empty="${mode}"]`);
  if (!empty) return;
  empty.hidden = hasItems;
}
function createSwitchCard({
  direction,
  count = 0,
  title = "",
  subtitle = "",
  buttonLabel = "",
}) {
  const card = document.createElement("article");
  card.className = "seguiti-switch-card";
  card.dataset.seguitiCardType = "switch";
  card.dataset.seguitiSwitchDirection = direction;

  const body = document.createElement("div");
  body.className = "seguiti-switch-card__body";

  const eyebrow = document.createElement("p");
  eyebrow.className = "seguiti-switch-card__eyebrow";
  eyebrow.textContent =
    direction === "to-past"
      ? `${count} eventi`
      : "Vista attiva";

  const heading = document.createElement("h3");
  heading.className = "seguiti-switch-card__title";
  heading.textContent = title;

  const text = document.createElement("p");
  text.className = "seguiti-switch-card__subtitle";
  text.textContent = subtitle;

  const actions = document.createElement("div");
  actions.className = "seguiti-switch-card__actions";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "seguiti-switch-card__btn";
  button.dataset.action =
    direction === "to-past" ? "show-past" : "show-active";
  button.textContent = buttonLabel;

  actions.appendChild(button);
  body.append(eyebrow, heading, text, actions);
  card.appendChild(body);

  return card;
}
function createDirectionalBridgeCard({
  leftTitle = "",
  leftText = "",
  rightTitle = "",
  rightText = "",
} = {}) {
  const card = document.createElement("article");
  card.className = "seguiti-directional-card";
  card.dataset.seguitiCardType = "directional-bridge";

  const inner = document.createElement("div");
  inner.className = "seguiti-directional-card__inner";

  const leftBtn = document.createElement("button");
  leftBtn.type = "button";
  leftBtn.className = "seguiti-directional-card__side seguiti-directional-card__side--left";
  leftBtn.dataset.action = "show-hot-past";

  const leftArrow = document.createElement("span");
  leftArrow.className = "seguiti-directional-card__arrow";
  leftArrow.setAttribute("aria-hidden", "true");
  leftArrow.textContent = "←";

  const leftHeading = document.createElement("strong");
  leftHeading.className = "seguiti-directional-card__title";
  leftHeading.textContent = leftTitle;

  const leftBody = document.createElement("span");
  leftBody.className = "seguiti-directional-card__text";
  leftBody.textContent = leftText;

  leftBtn.append(leftArrow, leftHeading, leftBody);

  const rightBtn = document.createElement("button");
  rightBtn.type = "button";
  rightBtn.className = "seguiti-directional-card__side seguiti-directional-card__side--right";
  rightBtn.dataset.action = "stay-active";

  const rightHeading = document.createElement("strong");
  rightHeading.className = "seguiti-directional-card__title";
  rightHeading.textContent = rightTitle;

  const rightBody = document.createElement("span");
  rightBody.className = "seguiti-directional-card__text";
  rightBody.textContent = rightText;

  const rightArrow = document.createElement("span");
  rightArrow.className = "seguiti-directional-card__arrow";
  rightArrow.setAttribute("aria-hidden", "true");
  rightArrow.textContent = "→";

  rightBtn.append(rightHeading, rightBody, rightArrow);

  inner.append(leftBtn, rightBtn);
  card.appendChild(inner);

  return card;
}
function renderOrganizerSection(refs, sectionData) {
  const fragment = refs.organizerTpl.content.cloneNode(true);
  const section = fragment.querySelector(".seguiti-organizer-section");
  const title = fragment.querySelector(".seguiti-organizer-title");
  const root = fragment.querySelector(".seguiti-organizer-section");
  const activeRail = fragment.querySelector('.seguiti-rail[data-rail="active"]');
  const pastRail = fragment.querySelector('.seguiti-rail[data-rail="past"]');

  section.dataset.organizerId = sectionData.organizerId;
  section.dataset.railMode = sectionData.initialMode;
  section.setAttribute("aria-label", `Eventi di ${sectionData.organizerName}`);
  title.textContent = sectionData.organizerName;

// ACTIVE RAIL
if (sectionData.hotPastEvents?.length > 0) {
  activeRail.appendChild(
    createDirectionalBridgeCard({
      leftTitle: "Appena conclusi",
      leftText: "A sinistra trovi gli eventi recenti di questo organizzatore.",
      rightTitle: "Eventi attivi",
      rightText: "A destra torni subito agli eventi disponibili.",
    })
  );
} else if (sectionData.coldPastEvents?.length > 0) {
  activeRail.appendChild(
    createSwitchCard({
      direction: "to-past",
      count: sectionData.pastEvents.length,
      title: "Rivedi gli eventi passati",
      subtitle: "Apri l’archivio recente degli eventi già conclusi.",
      buttonLabel: "Apri archivio",
    })
  );
}

const injectedActiveItems = injectBannerSlots(sectionData.activeEvents);

injectedActiveItems.forEach((item) => {
  if (item.type === "banner-slot") {
    activeRail.appendChild(createSeguitiBannerSlot(item.slotIndex));
    return;
  }

  activeRail.appendChild(createCard(refs, item.data));
});

// PAST RAIL
if (sectionData.activeEvents.length > 0) {
  pastRail.appendChild(
    createSwitchCard({
      direction: "to-active",
      title: "Torna agli eventi attivi",
      subtitle: "Rientra nella vista principale degli eventi disponibili.",
      buttonLabel: "Torna agli attivi",
    })
  );
}

sectionData.pastEvents.forEach((event) => {
  pastRail.appendChild(createCard(refs, event));
});

  updateRailEmpty(root, "active", sectionData.activeEvents.length > 0);
  updateRailEmpty(root, "past", sectionData.pastEvents.length > 0);

  setRailMode(root, sectionData.initialMode);

  return fragment;
}

function renderSections(refs, sections) {
  refs.sections.innerHTML = "";
  const frag = document.createDocumentFragment();

  sections.forEach((section) => {
    frag.appendChild(renderOrganizerSection(refs, section));
  });

  refs.sections.appendChild(frag);
}

function setRailMode(sectionEl, mode) {
  const nextMode = mode === "past" ? "past" : "active";
  sectionEl.dataset.railMode = nextMode;

  const activeRail = sectionEl.querySelector('.seguiti-rail[data-rail="active"]');
  const pastRail = sectionEl.querySelector('.seguiti-rail[data-rail="past"]');
  const activeScrollbar = sectionEl.querySelector('.seguiti-scrollbar[data-scrollbar="active"]');
  const pastScrollbar = sectionEl.querySelector('.seguiti-scrollbar[data-scrollbar="past"]');
  const activeEmpty = sectionEl.querySelector('.seguiti-rail-empty[data-empty="active"]');
  const pastEmpty = sectionEl.querySelector('.seguiti-rail-empty[data-empty="past"]');
  const showActive = nextMode === "active";
  const activeHasCards = !!activeRail && activeRail.children.length > 0;
  const pastHasCards = !!pastRail && pastRail.children.length > 0;

  if (activeRail) activeRail.hidden = !showActive || !activeHasCards;
  if (pastRail) pastRail.hidden = showActive || !pastHasCards;

  if (activeScrollbar) activeScrollbar.hidden = !showActive || !activeHasCards;
  if (pastScrollbar) pastScrollbar.hidden = showActive || !pastHasCards;

  if (activeEmpty) activeEmpty.hidden = !showActive || activeHasCards;
  if (pastEmpty) pastEmpty.hidden = showActive || pastHasCards;

  syncRailScrollbar(sectionEl);
}
function hasDirectionalBridgeCard(rail) {
  if (!rail) return false;

  return Boolean(
    rail.querySelector(
      '.seguiti-directional-card[data-seguiti-card-type="directional-bridge"]'
    )
  );
}

function scrollToFirstActiveEventCard(rail) {
  if (!rail) return;

  const target = rail.querySelector(".seguiti-card[data-event-id]");
  if (!target) return;

  const railRect = rail.getBoundingClientRect();
  const cardRect = target.getBoundingClientRect();
  const offset = cardRect.left - railRect.left + rail.scrollLeft;

  scrollRailTo(rail, offset);
}

function syncRailScrollbar(sectionEl) {
  const mode = sectionEl.dataset.railMode === "past" ? "past" : "active";
  const rail = sectionEl.querySelector(`.seguiti-rail[data-rail="${mode}"]`);
  const scrollbar = sectionEl.querySelector(`.seguiti-scrollbar[data-scrollbar="${mode}"]`);
  const thumb = scrollbar?.querySelector(".seguiti-scrollbar-thumb");

  if (!rail || !scrollbar || !thumb) return;

  const maxScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
  if (maxScroll <= 0) {
    thumb.style.width = "100%";
    thumb.style.transform = "translateX(0)";
    return;
  }

  const ratio = rail.clientWidth / rail.scrollWidth;
  const thumbWidth = Math.max(rail.clientWidth * ratio, 42);
  const trackWidth = scrollbar.clientWidth || rail.clientWidth;
  const maxThumbX = Math.max(trackWidth - thumbWidth, 0);
  const scrollRatio = rail.scrollLeft / maxScroll;
  const thumbX = maxThumbX * scrollRatio;

  thumb.style.width = `${thumbWidth}px`;
  thumb.style.transform = `translateX(${thumbX}px)`;
}

function bindRailScrollbars(sectionEl) {
  const rails = Array.from(sectionEl.querySelectorAll(".seguiti-rail"));
  rails.forEach((rail) => {
    rail.addEventListener("scroll", () => syncRailScrollbar(sectionEl), { passive: true });
  });

  window.addEventListener("resize", () => syncRailScrollbar(sectionEl), { passive: true });
}

function openEventDetail(eventId) {
  if (!eventId) return;
  try {
    sessionStorage.setItem("selectedEventId", eventId);
  } catch {}
  window.location.href = `/evento.html?id=${encodeURIComponent(eventId)}`;
}

async function joinEvent(eventId, buttonEl, refs) {
  if (!eventId || !buttonEl) return;

  buttonEl.disabled = true;
  buttonEl.classList.add("is-busy");
  const originalText = buttonEl.textContent;
  buttonEl.textContent = "Attendi...";

  try {
    await joinSeguitiEvent(eventId);
    await loadAndRender(refs);
  } catch (error) {
    buttonEl.disabled = false;
    buttonEl.classList.remove("is-busy");
    buttonEl.textContent = originalText || "Partecipa";
    window.alert(error?.message || "Non è stato possibile partecipare all'evento.");
  }
}

function bindCardActions(refs) {
  refs.sections.addEventListener("click", async (event) => {
    const switchBtn = event.target.closest(
  '[data-action="show-past"], [data-action="show-hot-past"], [data-action="show-active"], [data-action="stay-active"]'
);

if (switchBtn) {
  const section = switchBtn.closest(".seguiti-organizer-section");
  const action = switchBtn.dataset.action;

  if (action === "show-past" || action === "show-hot-past") {
    setRailMode(section, "past");

    const pastRail = section?.querySelector('.seguiti-rail[data-rail="past"]');
    requestAnimationFrame(() => {
      scrollRailTo(pastRail, 0);
    });
  } else if (action === "show-active" || action === "stay-active") {
    setRailMode(section, "active");

    const activeRail = section?.querySelector('.seguiti-rail[data-rail="active"]');
    requestAnimationFrame(() => {
      scrollToFirstActiveEventCard(activeRail);
    });
  }

  return;
}
    const openBtn = event.target.closest('[data-action="open-detail"]');
    if (openBtn) {
      const eventId = openBtn.dataset.eventId || openBtn.closest(".seguiti-card")?.dataset.eventId;
      openEventDetail(eventId);
      return;
    }

    const joinBtn = event.target.closest('[data-action="join-event"]');
    if (joinBtn) {
      const eventId = joinBtn.dataset.eventId || joinBtn.closest(".seguiti-card")?.dataset.eventId;
      await joinEvent(eventId, joinBtn, refs);
    }
  });
}

function syncBottomnavActive(refs) {
  const items = refs.bottomnav?.querySelectorAll(".seguiti-bottomnav__item") || [];
  items.forEach((item) => {
    const isActive = item.dataset.navKey === NAV_KEY;
    item.classList.toggle("is-active", isActive);
    item.classList.toggle("active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}
function setupSeguitiBannerEngine(refs, banners = [], tips = []) {
  if (seguitiState.bannerEngine) {
    seguitiState.bannerEngine.stop();
    seguitiState.bannerEngine = null;
  }

  const engine = createSeguitiBannerEngine({
    rotationInterval: SEGUITI_CONFIG.bannerRotationInterval,
  });

  const allSlots = refs.sections.querySelectorAll(
    '.seguiti-rail[data-rail="active"] .seguiti-banner-slot'
  );

  engine.bindSlots(allSlots);
  engine.setData({ banners, tips });
  engine.fillInitial();
  engine.start();

  seguitiState.bannerEngine = engine;
  return engine;
}
function bindVisibleSectionTracking(refs) {
  const sections = Array.from(refs.sections.querySelectorAll(".seguiti-organizer-section"));
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      const idx = sections.indexOf(visible.target);
      if (idx >= 0) seguitiState.activeSectionIndex = idx;
    },
    {
      root: refs.sections,
      threshold: [0.6],
    }
  );

  sections.forEach((section) => observer.observe(section));
}

async function loadAndRender(refs) {
  seguitiState.loading = true;
  seguitiState.error = null;
  showOnly(refs, "loading");

  try {
    const [rawEvents, banners] = await Promise.all([
      fetchFollowingEvents(),
      fetchFollowingBanners(currentUserProfile),
    ]);

    const normalizedEvents = normalizeEvents(rawEvents, currentUserId);
    const organizerSections = groupByOrganizer(normalizedEvents);

    seguitiState.rawEvents = rawEvents;
    seguitiState.normalizedEvents = normalizedEvents;
    seguitiState.organizerSections = organizerSections;

    if (!organizerSections.length) {
      if (seguitiState.bannerEngine) {
        seguitiState.bannerEngine.stop();
        seguitiState.bannerEngine = null;
      }

      showOnly(refs, "empty");
      return;
    }

    renderSections(refs, organizerSections);

    const renderedSections = Array.from(
      refs.sections.querySelectorAll(".seguiti-organizer-section")
    );

    renderedSections.forEach((sectionEl) => {
      bindRailScrollbars(sectionEl);
      syncRailScrollbar(sectionEl);
    });

    setupSeguitiBannerEngine(refs, banners, []);
    showOnly(refs, "sections");
    bindVisibleSectionTracking(refs);
  } catch (error) {
    if (seguitiState.bannerEngine) {
      seguitiState.bannerEngine.stop();
      seguitiState.bannerEngine = null;
    }
    seguitiState.error = error;
    if (refs.errorText) {
      refs.errorText.textContent =
        error?.message || "Riprova tra poco.";
    }
    showOnly(refs, "error");
  } finally {
    seguitiState.loading = false;
  }
}

export async function initSeguitiController(root = document) {
  const refs = getRefs(root);

  await setTopbarIdentity(refs);
  syncBottomnavActive(refs);
  bindCardActions(refs);

  refs.retryBtn?.addEventListener("click", () => {
    loadAndRender(refs);
  });

  await loadAndRender(refs);
  seguitiState.initialized = true;
}
