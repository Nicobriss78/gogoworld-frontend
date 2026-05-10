function getEventId(event) {
  return String(event?._id || event?.id || "").trim();
}

function getParticipantsCount(event) {
  if (Array.isArray(event?.participants)) return event.participants.length;
  if (Array.isArray(event?.attendees)) return event.attendees.length;
  if (typeof event?.participantsCount === "number") return event.participantsCount;
  return 0;
}

function getApprovalStatus(event) {
  return String(event?.approvalStatus || "pending").toLowerCase();
}

function getEventDate(event) {
  const value = event?.dateStart || event?.startDate || event?.startAt || event?.date;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function isUpcomingEvent(event, now = new Date()) {
  const date = getEventDate(event);
  return Boolean(date && date.getTime() >= now.getTime());
}

function sortByDateAsc(a, b) {
  const dateA = getEventDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
  const dateB = getEventDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;
  return dateA - dateB;
}

function sortByDateDesc(a, b) {
  const dateA = getEventDate(a)?.getTime() || 0;
  const dateB = getEventDate(b)?.getTime() || 0;
  return dateB - dateA;
}

function buildAttentionItems(events, trills) {
  const pendingEvents = events.filter((event) => getApprovalStatus(event) === "pending");
  const rejectedEvents = events.filter((event) => getApprovalStatus(event) === "rejected");
  const blockedEvents = events.filter((event) => getApprovalStatus(event) === "blocked");

  const upcomingWithoutParticipants = events
    .filter((event) => getApprovalStatus(event) === "approved")
    .filter((event) => isUpcomingEvent(event))
    .filter((event) => getParticipantsCount(event) === 0)
    .sort(sortByDateAsc)
    .slice(0, 3);

  const draftTrills = trills.filter((trill) => {
    const status = String(trill?.status || "").toLowerCase();
    return status === "draft" || status === "pending";
  });

  const items = [];

  if (pendingEvents.length) {
    items.push({
      tone: "warning",
      title: "Eventi in revisione",
      value: pendingEvents.length,
      text: "Sono in attesa di approvazione. Tienili monitorati prima della pubblicazione.",
      href: "/pages/organizer-events-v2.html",
    });
  }

  if (rejectedEvents.length) {
    items.push({
      tone: "danger",
      title: "Eventi respinti",
      value: rejectedEvents.length,
      text: "Richiedono correzioni prima di poter tornare utili all’organizzazione.",
      href: "/pages/organizer-events-v2.html",
    });
  }

  if (blockedEvents.length) {
    items.push({
      tone: "danger",
      title: "Eventi bloccati",
      value: blockedEvents.length,
      text: "Sono fermi per moderazione o problemi critici. Vanno verificati.",
      href: "/pages/organizer-events-v2.html",
    });
  }

  if (upcomingWithoutParticipants.length) {
    items.push({
      tone: "info",
      title: "Eventi imminenti senza partecipanti",
      value: upcomingWithoutParticipants.length,
      text: "Potrebbero avere bisogno di visibilità, trilli o promozione.",
      href: "/pages/organizer-events-v2.html",
    });
  }

  if (draftTrills.length) {
    items.push({
      tone: "info",
      title: "Trilli da gestire",
      value: draftTrills.length,
      text: "Ci sono trilli in bozza o non ancora inviati.",
      href: "/pages/organizer-trills-v2.html",
    });
  }

  return items.slice(0, 5);
}

function buildTopEvent(events) {
  return events.reduce((best, event) => {
    const count = getParticipantsCount(event);
    const bestCount = best ? getParticipantsCount(best) : -1;
    return count > bestCount ? event : best;
  }, null);
}

export function buildDashboardStats({ events = [], promos = [], trills = [] }) {
  const now = new Date();
  const totalEvents = events.length;

  const approvedEvents = events.filter((event) => getApprovalStatus(event) === "approved").length;
  const pendingEvents = events.filter((event) => getApprovalStatus(event) === "pending").length;
  const rejectedEvents = events.filter((event) => getApprovalStatus(event) === "rejected").length;
  const blockedEvents = events.filter((event) => getApprovalStatus(event) === "blocked").length;

  const totalParticipants = events.reduce((sum, event) => sum + getParticipantsCount(event), 0);
  const averageParticipants = totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0;

  const upcomingEvents = events
    .filter((event) => isUpcomingEvent(event, now))
    .sort(sortByDateAsc)
    .slice(0, 5);

  const recentEvents = [...events]
    .sort(sortByDateDesc)
    .slice(0, 5);

  const topEvent = buildTopEvent(events);

  return {
    totalEvents,
    approvedEvents,
    pendingEvents,
    rejectedEvents,
    blockedEvents,
    totalParticipants,
    averageParticipants,
    promoCount: promos.length,
    trillCount: trills.length,

    topEvent,
    topEventTitle: topEvent?.title || "Nessun evento",
    topEventParticipants: topEvent ? getParticipantsCount(topEvent) : 0,

    upcomingEvents,
    recentEvents,
    attentionItems: buildAttentionItems(events, trills),
    recentPromos: promos.slice(0, 3),
    recentTrills: trills.slice(0, 3),
  };
}

export function getDashboardEventId(event) {
  return getEventId(event);
}

export function getDashboardParticipantsCount(event) {
  return getParticipantsCount(event);
}

export function getDashboardApprovalStatus(event) {
  return getApprovalStatus(event);
}

export function getDashboardEventDate(event) {
  return getEventDate(event);
}
