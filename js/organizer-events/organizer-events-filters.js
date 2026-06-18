export function getParticipantsCount(event) {
  if (Array.isArray(event?.participants)) return event.participants.length;
  if (Array.isArray(event?.attendees)) return event.attendees.length;
  if (typeof event?.participantsCount === "number") return event.participantsCount;
  return 0;
}

export function getApprovalStatus(event) {
  return String(event?.approvalStatus || "pending").toLowerCase();
}

export function getEventDate(event) {
  const value = event?.dateStart || event?.startDate || event?.startAt || event?.date;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function getEventEndDate(event) {
  const value = event?.dateEnd || event?.endDate || event?.endAt;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function isPrivateEvent(event) {
  return Boolean(event?.isPrivate) || String(event?.visibility || "").toLowerCase() === "private";
}

export function isUpcomingEvent(event) {
  const date = getEventDate(event);
  return Boolean(date && date.getTime() >= Date.now());
}

export function isOngoingEvent(event) {
  const start = getEventDate(event);
  const end = getEventEndDate(event);
  const now = Date.now();

  return Boolean(start && end && start.getTime() <= now && end.getTime() >= now);
}

export function isPastEvent(event) {
  const end = getEventEndDate(event);
  const start = getEventDate(event);
  const reference = end || start;

  return Boolean(reference && reference.getTime() < Date.now());
}

export function needsCorrection(event) {
  const status = getApprovalStatus(event);
  return status === "rejected" || status === "blocked";
}

export function isApprovedUpcomingWithoutParticipants(event) {
  return (
    getApprovalStatus(event) === "approved" &&
    isUpcomingEvent(event) &&
    getParticipantsCount(event) === 0
  );
}

function matchesQuery(event, query) {
  if (!query) return true;

  const haystack = [
    event?.title,
    event?.description,
    event?.city,
    event?.region,
    event?.venueName,
    event?.address,
    event?.category,
    event?.subcategory,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  return haystack.includes(query);
}

function matchesTemporal(event, temporal) {
  if (temporal === "all") return true;
  if (temporal === "upcoming") return isUpcomingEvent(event);
  if (temporal === "ongoing") return isOngoingEvent(event);
  if (temporal === "past") return isPastEvent(event);
  return true;
}

function matchesSpecial(event, special) {
  if (special === "all") return true;
  if (special === "no-participants") return isApprovedUpcomingWithoutParticipants(event);
  if (special === "needs-correction") return needsCorrection(event);
  return true;
}

export function applyEventFilters(events, filters) {
  const query = String(filters.query || "").trim().toLowerCase();
  const approvalStatus = filters.approvalStatus || "all";
  const privacy = filters.privacy || "all";
  const temporal = filters.temporal || "all";
  const special = filters.special || "all";
  const sort = filters.sort || "default";
  return events
    .filter((event) => {
      const matchesApproval =
        approvalStatus === "all" || getApprovalStatus(event) === approvalStatus;

      const isPrivate = isPrivateEvent(event);
      const matchesPrivacy =
        privacy === "all" ||
        (privacy === "private" && isPrivate) ||
        (privacy === "public" && !isPrivate);

      return (
        matchesQuery(event, query) &&
        matchesApproval &&
        matchesVisibility &&
        matchesPrivacy &&
        matchesTemporal(event, temporal) &&
        matchesSpecial(event, special)
      );
    })
    .sort((a, b) => sortEventsForOrganizer(a, b, sort));
}

export function sortEventsForOrganizer(a, b, sort = "default") {
  if (sort === "participants") {
    const participantsA = getParticipantsCount(a);
    const participantsB = getParticipantsCount(b);

    if (participantsA !== participantsB) {
      return participantsB - participantsA;
    }
  }

  const aPast = isPastEvent(a);
  const bPast = isPastEvent(b);

  if (aPast !== bPast) return aPast ? 1 : -1;

  const dateA = getEventDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
  const dateB = getEventDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;

  return aPast ? dateB - dateA : dateA - dateB;
}
