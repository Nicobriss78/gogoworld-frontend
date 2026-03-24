const ACTIVE_STATUSES = new Set(["future", "imminent", "ongoing"]);
const PAST_STATUSES = new Set(["concluded", "past"]);

const STATUS_LABELS = {
  future: "In arrivo",
  imminent: "Imminente",
  ongoing: "In corso",
  concluded: "Concluso da poco",
  past: "Passato",
};

function normalizeText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

export function normalizeEvent(event, currentUserId) {
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
      return String(pid) === String(currentUserId || "");
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

export function normalizeEvents(events, currentUserId) {
  if (!Array.isArray(events)) return [];
  return events
    .map((e) => normalizeEvent(e, currentUserId))
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

function splitEventsAdvanced(events) {
  const { activeEvents, pastEvents } = splitEvents(events);
  const now = Date.now();

  const hotPastEvents = pastEvents.filter((event) => {
    const rawDate = event.dateEnd || event.dateStart;
    if (!rawDate) return false;

    const time = new Date(rawDate).getTime();
    if (Number.isNaN(time)) return false;

    const diffDays = (now - time) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });

  const coldPastEvents = pastEvents.filter(
    (event) => !hotPastEvents.includes(event)
  );

  return {
    activeEvents,
    hotPastEvents,
    coldPastEvents,
    pastEvents: [...hotPastEvents, ...coldPastEvents],
  };
}

export function groupByOrganizer(events) {
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
      const { activeEvents, hotPastEvents, coldPastEvents, pastEvents } =
        splitEventsAdvanced(group.events);

      const initialMode = activeEvents.length
        ? "active"
        : pastEvents.length
        ? "past"
        : "active";

      return {
        organizerId: group.organizerId,
        organizerName: group.organizerName,
        activeEvents,
        hotPastEvents,
        coldPastEvents,
        pastEvents,
        initialMode,
      };
    })
    .filter((group) => group.activeEvents.length || group.pastEvents.length);

  return groups.sort((a, b) =>
    a.organizerName.localeCompare(b.organizerName, "it", {
      sensitivity: "base",
    })
  );
          }
