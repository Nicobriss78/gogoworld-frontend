import {
  resolveUserIdentity,
  applyUserIdentityToTopbar,
} from "../shared/user-identity.js";

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
const FOLLOWING_ENDPOINT = "/api/events/following/list";

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function apiGet(url) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    try {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    } catch {}
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      "Errore durante il caricamento dei dati.";
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

async function apiPost(url, body) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify(body || {}),
  });

  if (res.status === 401) {
    try {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    } catch {}
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      "Operazione non riuscita.";
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

function getRefs(root = document) {
  return {
    root,
    greeting: root.getElementById("seguitiGreeting"),
    role: root.getElementById("seguitiRole"),
    body: root.getElementById("seguitiBody"),
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
};

async function setTopbarIdentity(refs) {
  const identity = await resolveUserIdentity();
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

function normalizeText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function normalizeEvent(event) {
  const organizerId =
    event?.organizer?._id ||
    event?.organizer?.id ||
    event?.organizer ||
    "";

  const organizerName =
    normalizeText(event?.organizer?.name) ||
    "Organizzatore";

  const participants = Array.isArray(event?.participants) ? event.participants : [];

  const joined =
    Boolean(event?.joined) ||
    participants.some((p) => {
      const pid = typeof p === "object" ? p?._id || p?.id : p;
      try {
        const rawUser = localStorage.getItem("user");
        if (!rawUser) return false;
        const user = JSON.parse(rawUser);
        return String(pid) === String(user?._id || user?.id || "");
      } catch {
        return false;
      }
    });

  const coverImage =
    normalizeText(event?.coverImage) ||
    normalizeText(event?.imageUrl) ||
    (Array.isArray(event?.images) && normalizeText(event.images[0])) ||
    "";

  return {
    _id: String(event?._id || ""),
    title: normalizeText(event?.title, "Evento senza titolo"),
    status: normalizeText(event?.status, "future"),
    dateStart: event?.dateStart || event?.date || null,
    dateEnd: event?.dateEnd || event?.endDate || null,
    city: normalizeText(event?.city),
    region: normalizeText(event?.region),
    country: normalizeText(event?.country),
    category: normalizeText(event?.category),
    subcategory: normalizeText(event?.subcategory),
    language: normalizeText(event?.language),
    target: normalizeText(event?.target),
    isFree: Boolean(event?.isFree),
    price:
      typeof event?.price === "number"
        ? event.price
        : Number.isFinite(Number(event?.price))
          ? Number(event.price)
          : null,
    currency: normalizeText(event?.currency, "EUR"),
    coverImage,
    organizer: {
      _id: String(organizerId),
      name: organizerName,
    },
    participants,
    joined,
  };
}

function normalizeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events
    .map(normalizeEvent)
    .filter((event) => event._id && event.organizer._id);
}

function compareEvents(a, b) {
  const rank = {
    ongoing: 0,
    imminent: 1,
    future: 2,
    concluded: 3,
    past: 4,
  };

  const ra = rank[a?.status] ?? 99;
  const rb = rank[b?.status] ?? 99;
  if (ra !== rb) return ra - rb;

  const ta = a?.dateStart ? new Date(a.dateStart).getTime() : 0;
  const tb = b?.dateStart ? new Date(b.dateStart).getTime() : 0;
  return ta - tb;
}

function splitEvents(events) {
  const activeEvents = [];
  const pastEvents = [];

  events.forEach((event) => {
    if (ACTIVE_STATUSES.has(event.status)) activeEvents.push(event);
    else if (PAST_STATUSES.has(event.status)) pastEvents.push(event);
  });

  activeEvents.sort(compareEvents);
  pastEvents.sort(compareEvents);

  return { activeEvents, pastEvents };
}

function groupByOrganizer(events) {
  const map = new Map();

  events.forEach((event) => {
    const key = event.organizer._id;
    if (!map.has(key)) {
      map.set(key, {
        organizerId: key,
        organizerName: event.organizer.name,
        events: [],
      });
    }
    map.get(key).events.push(event);
  });

  const groups = Array.from(map.values())
    .map((group) => {
      const { activeEvents, pastEvents } = splitEvents(group.events);
      const initialMode = activeEvents.length
        ? "active"
        : pastEvents.length
          ? "past"
          : "active";

      return {
        organizerId: group.organizerId,
        organizerName: group.organizerName,
        activeEvents,
        pastEvents,
        initialMode,
      };
    })
    .filter((group) => group.activeEvents.length || group.pastEvents.length);

  return groups.sort((a, b) =>
    a.organizerName.localeCompare(b.organizerName, "it", { sensitivity: "base" })
  );
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

  sectionData.activeEvents.forEach((event) => {
    activeRail.appendChild(createCard(refs, event));
  });

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
    await apiPost(`/api/events/${encodeURIComponent(eventId)}/join`);
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

async function fetchFollowingEvents() {
  const data = await apiGet(FOLLOWING_ENDPOINT);
  return Array.isArray(data?.events) ? data.events : [];
}

async function loadAndRender(refs) {
  seguitiState.loading = true;
  seguitiState.error = null;
  showOnly(refs, "loading");

  try {
    const rawEvents = await fetchFollowingEvents();
    const normalizedEvents = normalizeEvents(rawEvents);
    const organizerSections = groupByOrganizer(normalizedEvents);

    seguitiState.rawEvents = rawEvents;
    seguitiState.normalizedEvents = normalizedEvents;
    seguitiState.organizerSections = organizerSections;

    if (!organizerSections.length) {
      showOnly(refs, "empty");
      return;
    }

    renderSections(refs, organizerSections);

    const renderedSections = Array.from(
      refs.sections.querySelectorAll(".seguiti-organizer-section")
    );

    renderedSections.forEach((sectionEl) => {
      bindRailMode(sectionEl);
      bindRailScrollbars(sectionEl);
      syncRailScrollbar(sectionEl);
    });

    showOnly(refs, "sections");
    bindVisibleSectionTracking(refs);
  } catch (error) {
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
