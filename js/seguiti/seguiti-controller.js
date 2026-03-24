import {
  resolveUserIdentity,
  applyUserIdentityToTopbar,
} from "../shared/user-identity.js";
import { createSeguitiBannerEngine } from "./seguiti-banners.js";
import {
  fetchFollowingEvents,
  fetchFollowingBanners,
  joinSeguitiEvent,
} from "./seguiti-api.js";
import {
  normalizeEvents,
  groupByOrganizer,
  renderSections,
  setRailMode,
  scrollRailTo,
  scrollToFirstActiveEventCard,
  syncRailScrollbar,
  bindRailScrollbars,
} from "./seguiti-renderer.js";

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
  rotationInterval: 7000,
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
