function getParticipantsCount(event) {
  if (Array.isArray(event?.participants)) return event.participants.length;
  if (Array.isArray(event?.attendees)) return event.attendees.length;
  if (typeof event?.participantsCount === "number") return event.participantsCount;
  return 0;
}

function getEventDate(event) {
  const value = event?.dateStart || event?.startDate || event?.startAt || event?.date;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function isUpcomingEvent(event) {
  const date = getEventDate(event);
  return Boolean(date && date.getTime() >= Date.now());
}

export function applyEventFilters(events, filters) {
  const query = String(filters.query || "").trim().toLowerCase();
  const approvalStatus = filters.approvalStatus || "all";
  const visibility = filters.visibility || "all";
  const privacy = filters.privacy || "all";
  const special = filters.special || "all";

  return events.filter((event) => {
    const title = String(event.title || "").toLowerCase();
    const city = String(event.city || "").toLowerCase();
    const region = String(event.region || "").toLowerCase();

    const matchesQuery =
      !query ||
      title.includes(query) ||
      city.includes(query) ||
      region.includes(query);

    const matchesApproval =
      approvalStatus === "all" ||
      String(event.approvalStatus || "").toLowerCase() === approvalStatus;

    const matchesVisibility =
      visibility === "all" ||
      String(event.visibility || "").toLowerCase() === visibility;

    const isPrivate = Boolean(event.isPrivate);
    const matchesPrivacy =
      privacy === "all" ||
      (privacy === "private" && isPrivate) ||
      (privacy === "public" && !isPrivate);

    const matchesSpecial =
      special === "all" ||
      (special === "no-participants" &&
        String(event.approvalStatus || "").toLowerCase() === "approved" &&
        isUpcomingEvent(event) &&
        getParticipantsCount(event) === 0);

    return (
      matchesQuery &&
      matchesApproval &&
      matchesVisibility &&
      matchesPrivacy &&
      matchesSpecial
    );
  });
}
