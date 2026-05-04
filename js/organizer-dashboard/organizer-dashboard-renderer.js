function renderStat(label, value) {
  return `
    <article class="org-dashboard-stat">
      <strong>${value}</strong>
      <span>${label}</span>
    </article>
  `;
}

export function renderDashboard(state) {
  const root = document.querySelector("[data-org-dashboard-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `
      <h1>Dashboard Organizer V2</h1>
      <p>Caricamento dati reali...</p>
    `;
    return;
  }

  if (state.error) {
    root.innerHTML = `
      <h1>Dashboard Organizer V2</h1>
      <p>Errore nel caricamento dei dati.</p>
      <pre>${state.error}</pre>
    `;
    return;
  }

  root.innerHTML = `
    <h1>Dashboard Organizer V2</h1>
    <p>Dati reali caricati dal backend.</p>

    <section class="org-dashboard-grid">
      ${renderStat("Eventi totali", state.stats.totalEvents)}
      ${renderStat("Eventi approvati", state.stats.approvedEvents)}
      ${renderStat("Eventi in revisione", state.stats.pendingEvents)}
      ${renderStat("Eventi respinti", state.stats.rejectedEvents)}
      ${renderStat("Eventi bloccati", state.stats.blockedEvents)}
      ${renderStat("Partecipanti totali", state.stats.totalParticipants)}
      ${renderStat("Media partecipanti", state.stats.averageParticipants)}
      ${renderStat("Promozioni", state.stats.promoCount)}
      ${renderStat("Trilli", state.stats.trillCount)}
    </section>

    <section class="org-dashboard-summary">
      <h2>Top evento</h2>
      <p>${state.stats.topEventTitle}</p>
    </section>
  `;
}
