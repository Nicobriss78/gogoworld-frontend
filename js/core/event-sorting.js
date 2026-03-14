// core/event-sorting.js
// Sorting utilities for participant events.
// Allineato agli stati reali calcolati dal backend:
// ongoing, imminent, future, concluded, past

export const statusPriority = {
  ongoing: 0,
  imminent: 1,
  future: 2,
  concluded: 3,
  past: 9,
};

export function getStatusPriority(status) {
  return statusPriority[String(status || "").toLowerCase()] ?? 50;
}

export function getStartTime(ev) {
  const raw = ev?.dateStart || ev?.date || ev?.startDate || null;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : Number.POSITIVE_INFINITY;
}

export function getEndTime(ev) {
  const raw = ev?.dateEnd || ev?.endDate || ev?.dateStart || ev?.date || ev?.startDate || null;
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : Number.POSITIVE_INFINITY;
}

/**
 * Sort events by:
 * 1) status priority (ongoing -> imminent -> future -> concluded -> past)
 * 2) for past: end date descending (più recenti prima)
 * 3) for all others: start date ascending
 */
export function sortEventsForParticipant(events) {
  const arr = Array.isArray(events) ? events : [];

  return [...arr].sort((a, b) => {
    const sa = String(a?.status || "").toLowerCase();
    const sb = String(b?.status || "").toLowerCase();

    const pa = getStatusPriority(sa);
    const pb = getStatusPriority(sb);

    if (pa !== pb) return pa - pb;

    if (sa === "past" && sb === "past") {
      return getEndTime(b) - getEndTime(a);
    }

    return getStartTime(a) - getStartTime(b);
  });
}
