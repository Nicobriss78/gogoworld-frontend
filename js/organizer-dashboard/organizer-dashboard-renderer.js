function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStat(label, value) {
  return `
    <article class="org-dashboard-stat">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
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
      <pre>${escapeHtml(state.error)}</pre>
    `;
    return;
  }

  const stats = state.stats || {};

  root.innerHTML = `
    <h1>Dashboard Organizer V2</h1>
    <p>Dati reali caricati dal backend.</p>

    <section class="org-dashboard-grid">
      ${renderStat("Eventi totali", stats.totalEvents)}
      ${renderStat("Eventi approvati", stats.approvedEvents)}
      ${renderStat("Eventi in revisione", stats.pendingEvents)}
      ${renderStat("Eventi respinti", stats.rejectedEvents)}
      ${renderStat("Eventi bloccati", stats.blockedEvents)}
      ${renderStat("Partecipanti totali", stats.totalParticipants)}
      ${renderStat("Media partecipanti", stats.averageParticipants)}
      ${renderStat("Promozioni", stats.promoCount)}
      ${renderStat("Trilli", stats.trillCount)}
    </section>

    <section class="org-dashboard-summary">
      <h2>Top evento</h2>
      <p>${escapeHtml(stats.topEventTitle || "N/D")}</p>
    </section>
  `;
}
