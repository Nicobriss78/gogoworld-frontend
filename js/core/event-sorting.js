// core/event-sorting.js
// Sorting utilities for participant events.
// Extracted from partecipante.js (loadEvents) - pure functions.

export const statusPriority = {
  live: 0,
  imminent: 1,
  future: 2,
  past: 9,
};

export function getStatusPriority(status) {
  return statusPriority[status] ?? 50;
}

export function getStartTime(ev) {
  const d = ev?.startDate ? new Date(ev.startDate) : null;
  return d && !isNaN(d) ? d.getTime() : Number.POSITIVE_INFINITY;
}

/**
 * Sort events by:
 * 1) status priority (live -> imminent -> future -> past)
 * 2) startDate ascending
 */
export function sortEventsForParticipant(events) {
  return [...(events || [])].sort((a, b) => {
    const pa = getStatusPriority(a?.status);
    const pb = getStatusPriority(b?.status);
    if (pa !== pb) return pa - pb;
    return getStartTime(a) - getStartTime(b);
  });
}
