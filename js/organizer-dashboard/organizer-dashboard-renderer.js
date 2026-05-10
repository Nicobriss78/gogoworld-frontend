import {
  getDashboardApprovalStatus,
  getDashboardEventDate,
  getDashboardEventId,
  getDashboardParticipantsCount,
} from "./organizer-dashboard-widgets.js?v=12";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodeUrlValue(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

function withDashboardReturn(href) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}rootReturnTo=organizer-dashboard`;
}

function formatDate(value) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "Data non disponibile";
  }

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status) {
  const labels = {
    approved: "Approvato",
    pending: "In revisione",
    rejected: "Respinto",
    blocked: "Bloccato",
  };

  return labels[status] || "Da verificare";
}

function renderKpi({ label, value, hint, tone = "default" }) {
  return `
    <article class="org-dashboard-kpi org-dashboard-kpi--${tone}">
      <span class="org-dashboard-kpi__label">${escapeHtml(label)}</span>
      <strong class="org-dashboard-kpi__value">${escapeHtml(value)}</strong>
      <span class="org-dashboard-kpi__hint">${escapeHtml(hint)}</span>
    </article>
  `;
}

function renderAction({ label, href, tone = "primary", disabled = false }) {
  if (disabled) {
    return `
      <span class="org-dashboard-action org-dashboard-action--disabled">
        ${escapeHtml(label)}
      </span>
    `;
  }

  return `
    <a class="org-dashboard-action org-dashboard-action--${tone}" href="${escapeHtml(href)}">
      ${escapeHtml(label)}
    </a>
  `;
}

function renderAttentionItem(item) {
  return `
    <a class="org-dashboard-alert org-dashboard-alert--${escapeHtml(item.tone)}" href="${escapeHtml(item.href)}">
      <span class="org-dashboard-alert__value">${escapeHtml(item.value)}</span>
      <span class="org-dashboard-alert__body">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.text)}</span>
      </span>
    </a>
  `;
}

function renderEventRow(event) {
  const eventId = getDashboardEventId(event);
  const encodedId = encodeUrlValue(eventId);
  const status = getDashboardApprovalStatus(event);
  const participants = getDashboardParticipantsCount(event);
  const eventDate = getDashboardEventDate(event);

  return `
    <article class="org-dashboard-event">
      <div class="org-dashboard-event__main">
        <h3>${escapeHtml(event?.title || "Evento senza titolo")}</h3>
        <p>${escapeHtml(event?.city || event?.region || "Luogo non indicato")} · ${escapeHtml(formatDate(eventDate))}</p>
      </div>

      <div class="org-dashboard-event__meta">
        <span class="org-dashboard-status org-dashboard-status--${escapeHtml(status)}">
          ${escapeHtml(getStatusLabel(status))}
        </span>
        <span>${participants} partecipanti</span>
      </div>

      ${
        eventId
          ? `<a class="org-dashboard-event__link" href="${escapeHtml(withDashboardReturn(`/pages/organizer-event-detail-v2.html?id=${encodedId}`))}">Apri</a>`
          : ""
      }
    </article>
  `;
}

function renderEmpty(message) {
  return `<div class="org-dashboard-empty">${escapeHtml(message)}</div>`;
}

function renderOperationalSummary(stats) {
  if (!stats.attentionItems?.length) {
    return `
      <section class="org-dashboard-panel org-dashboard-panel--calm">
        <div class="org-dashboard-panel__head">
          <h2>Tutto sotto controllo</h2>
          <p>Non ci sono criticità operative immediate.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="org-dashboard-panel">
      <div class="org-dashboard-panel__head">
        <h2>Richiedono attenzione</h2>
        <p>Priorità operative basate sui tuoi dati reali.</p>
      </div>

      <div class="org-dashboard-alerts">
        ${stats.attentionItems.map(renderAttentionItem).join("")}
      </div>
    </section>
  `;
}

function renderTopEvent(stats) {
  const event = stats.topEvent;
  const eventId = getDashboardEventId(event);
  const encodedId = encodeUrlValue(eventId);

  if (!event) {
    return `
      <section class="org-dashboard-panel">
        <div class="org-dashboard-panel__head">
          <h2>Evento più seguito</h2>
          <p>Nessun evento disponibile.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="org-dashboard-panel org-dashboard-panel--highlight">
      <div class="org-dashboard-panel__head">
        <h2>Evento più seguito</h2>
        <p>Il riferimento migliore per capire cosa sta funzionando.</p>
      </div>

      <article class="org-dashboard-top-event">
        <strong>${escapeHtml(event.title || "Evento senza titolo")}</strong>
        <span>${escapeHtml(stats.topEventParticipants)} partecipanti</span>
        ${eventId ? `<a href="${escapeHtml(withDashboardReturn(`/pages/organizer-event-detail-v2.html?id=${encodedId}`))}">Apri evento</a>` : ""}
      </article>
    </section>
  `;
}

export function renderDashboard(state) {
  const root = document.querySelector("[data-org-dashboard-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `
      <section class="org-dashboard-hero">
        <h1>Dashboard Organizer</h1>
        <p>Caricamento dei dati reali...</p>
      </section>
    `;
    return;
  }

  if (state.error) {
    root.innerHTML = `
      <section class="org-dashboard-hero">
        <h1>Dashboard Organizer</h1>
        <p>Non riesco a caricare i dati in questo momento.</p>
      </section>

      <section class="org-dashboard-error">
        <strong>Errore</strong>
        <pre>${escapeHtml(state.error)}</pre>
      </section>
    `;
    return;
  }

  const stats = state.stats || {};

  root.innerHTML = `
    <section class="org-dashboard-hero">
      <div>
        <h1>Dashboard Organizer</h1>
        <p>Eventi, trilli e promozioni sotto controllo.</p>
      </div>

      <div class="org-dashboard-hero__actions">
        ${renderAction({ label: "Crea evento", href: withDashboardReturn("/pages/organizer-event-create-v2.html") })}
        ${renderAction({ label: "Gestisci eventi", href: "/pages/organizer-events-v2.html", tone: "ghost" })}
      </div>
    </section>

    <section class="org-dashboard-kpis" aria-label="Indicatori principali">
      ${renderKpi({
        label: "Eventi totali",
        value: stats.totalEvents,
        hint: "Tutti gli eventi creati",
      })}
      ${renderKpi({
        label: "Approvati",
        value: stats.approvedEvents,
        hint: "Visibili e utilizzabili",
        tone: "good",
      })}
      ${renderKpi({
        label: "In revisione",
        value: stats.pendingEvents,
        hint: "In attesa di controllo",
        tone: stats.pendingEvents ? "warning" : "default",
      })}
      ${renderKpi({
        label: "Da correggere",
        value: Number(stats.rejectedEvents || 0) + Number(stats.blockedEvents || 0),
        hint: "Respinti o bloccati",
        tone: stats.rejectedEvents || stats.blockedEvents ? "danger" : "default",
      })}
      ${renderKpi({
        label: "Partecipanti",
        value: stats.totalParticipants,
        hint: `Media ${stats.averageParticipants || 0} per evento`,
      })}
      ${renderKpi({
        label: "Trilli",
        value: stats.trillCount,
        hint: "Creati dall’organizzatore",
      })}
    </section>

    ${renderOperationalSummary(stats)}

    <section class="org-dashboard-columns">
      <section class="org-dashboard-panel">
        <div class="org-dashboard-panel__head">
          <h2>Prossimi eventi</h2>
          <p>Gli eventi futuri più vicini nel calendario.</p>
        </div>

        <div class="org-dashboard-events">
          ${
            stats.upcomingEvents?.length
              ? stats.upcomingEvents.map(renderEventRow).join("")
              : renderEmpty("Nessun evento futuro trovato.")
          }
        </div>
      </section>

      ${renderTopEvent(stats)}
    </section>

    <section class="org-dashboard-panel">
      <div class="org-dashboard-panel__head">
        <h2>Azioni rapide</h2>
        <p>Le operazioni più importanti per gestire la tua attività.</p>
      </div>

      <div class="org-dashboard-actions">
        ${renderAction({ label: "Crea evento", href: withDashboardReturn("/pages/organizer-event-create-v2.html") })}
        ${renderAction({ label: "Eventi", href: "/pages/organizer-events-v2.html?from=dashboard", tone: "ghost" })}
        ${renderAction({ label: "Trilli", href: "/pages/organizer-trills-v2.html?from=dashboard", tone: "ghost" })}
        ${renderAction({ label: "Promozioni", href: "#", disabled: true })}
        ${renderAction({ label: "Mappa Organizer", href: "#", disabled: true })}
      </div>
    </section>
  `;
}
