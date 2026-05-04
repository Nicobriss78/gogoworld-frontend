export function buildDashboardStats({ events = [], promos = [], trills = [] }) {
  const totalEvents = events.length;

  const approvedEvents = events.filter((event) => event.approvalStatus === "approved").length;
  const pendingEvents = events.filter((event) => event.approvalStatus === "pending").length;
  const rejectedEvents = events.filter((event) => event.approvalStatus === "rejected").length;
  const blockedEvents = events.filter((event) => event.approvalStatus === "blocked").length;

  const totalParticipants = events.reduce((sum, event) => {
    const count = Array.isArray(event.participants) ? event.participants.length : 0;
    return sum + count;
  }, 0);

  const averageParticipants =
    totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0;

  const topEvent = events.reduce((best, event) => {
    const count = Array.isArray(event.participants) ? event.participants.length : 0;
    const bestCount = best && Array.isArray(best.participants) ? best.participants.length : -1;
    return count > bestCount ? event : best;
  }, null);

  return {
    totalEvents,
    approvedEvents,
    pendingEvents,
    rejectedEvents,
    blockedEvents,
    totalParticipants,
    averageParticipants,
    topEventTitle: topEvent?.title || "Nessun evento",
    promoCount: promos.length,
    trillCount: trills.length,
  };
}
