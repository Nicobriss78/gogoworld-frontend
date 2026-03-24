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

export function splitEvents(events = [], currentUserId = null) {
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
