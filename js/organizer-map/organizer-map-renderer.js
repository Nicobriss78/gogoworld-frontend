function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = value ? new Date(value) : null;

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

function getEvents(state) {
  return Array.isArray(state?.data?.events) ? state.data.events : [];
}

function getKpis(state) {
  return state?.data?.kpis || {};
}

function getStatusClass(level) {
  const safeLevel = String(level || "ok").toLowerCase();

  if (["ok", "monitor", "action", "critical"].includes(safeLevel)) {
    return safeLevel;
  }

  return "ok";
}
function getApprovalLabel(status) {
  const map = {
    approved: "Approvato",
    pending_review: "In revisione",
    rejected: "Da correggere",
    blocked: "Bloccato",
  };

  return map[status] || "In revisione";
}

function getPrivacyModeLabel(mode) {
  const map = {
    privacy_safe_aggregate_only: "Modalità aggregata protetta",
    aggregate_only: "Modalità aggregata protetta",
  };

  return map[mode] || "Modalità protetta";
}

function getAreaLabel(event) {
  if (event?.city) return `Area ${event.city}`;
  if (event?.region) return `Area ${event.region}`;
  return "Area operativa";
}
function renderKpi(label, value, hint) {
  return `
    <article class="org-map-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value ?? 0)}</strong>
      <small>${escapeHtml(hint)}</small>
    </article>
  `;
}

function renderLegend() {
  return `
    <section class="org-map-panel">
      <div class="org-map-panel__head">
        <h2>Legenda operativa</h2>
        <p>Stato calcolato dal backend in modalità privacy-safe.</p>
      </div>

      <div class="org-map-legend">
        <span><i class="org-map-dot org-map-dot--ok"></i> Ok</span>
        <span><i class="org-map-dot org-map-dot--monitor"></i> Da monitorare</span>
        <span><i class="org-map-dot org-map-dot--action"></i> Richiede azione</span>
        <span><i class="org-map-dot org-map-dot--critical"></i> Critico</span>
      </div>
    </section>
  `;
}

function renderPrivacyBox(privacy) {
  return `
    <section class="org-map-panel org-map-panel--privacy">
      <div class="org-map-panel__head">
        <h2>Privacy safe</h2>
        <p>
          ${escapeHtml(getPrivacyModeLabel(privacy?.mode))}
          · soglia minima cluster: ${escapeHtml(privacy?.minClusterSize || 5)}
        </p>
      </div>

      <div class="org-map-privacy-list">
        <span>Identità utenti: ${privacy?.exposesUserIdentity ? "esposta" : "non esposta"}</span>
        <span>Coordinate utenti: ${privacy?.exposesUserCoordinates ? "esposte" : "non esposte"}</span>
      </div>
    </section>
  `;
}

function renderSuggestion(suggestion) {
  return `
    <li>
      <strong>${escapeHtml(suggestion?.priority || "medium")}</strong>
      <span>${escapeHtml(suggestion?.message || "Suggerimento operativo")}</span>
    </li>
  `;
}

function renderEventCard(event) {
  const level = getStatusClass(event?.operationalStatus?.level);
  const pointLabel = event?.point
    ? `${Number(event.point.lat).toFixed(3)}, ${Number(event.point.lon).toFixed(3)}`
    : "Coordinate evento non disponibili";

  return `
    <article class="org-map-event-card org-map-event-card--${level}" data-org-map-event-id="${escapeHtml(event.id)}">
      <div class="org-map-event-card__head">
        <div>
          <h3>${escapeHtml(event.title || "Evento senza titolo")}</h3>
          <p>${escapeHtml(event.city || event.region || "Luogo non indicato")} · ${escapeHtml(formatDate(event.dateStart))}</p>
        </div>

        <span class="org-map-status org-map-status--${level}">
          ${escapeHtml(event?.operationalStatus?.label || "Ok")}
        </span>
      </div>

      <div class="org-map-event-card__meta">
        <span>${event.isPrivate ? "Privato" : "Pubblico"}</span>
        <span>${escapeHtml(event.approvalStatus || "pending")}</span>
        <span>${escapeHtml(pointLabel)}</span>
      </div>

      <div class="org-map-metrics">
        <span><strong>${escapeHtml(event?.metrics?.participantsCount || 0)}</strong> partecipanti</span>
        <span><strong>${escapeHtml(event?.metrics?.checkInsCount || 0)}</strong> check-in</span>
        <span><strong>${escapeHtml(event?.metrics?.trillsCount || 0)}</strong> trilli</span>
        <span><strong>${escapeHtml(event?.metrics?.promosCount || 0)}</strong> promo</span>
      </div>

      <p class="org-map-reason">
        ${escapeHtml(event?.operationalStatus?.reason || "Evento operativo.")}
      </p>

      ${
        event?.suggestions?.length
          ? `<ul class="org-map-suggestions">${event.suggestions.map(renderSuggestion).join("")}</ul>`
          : ""
      }

      <div class="org-map-actions">
        <a href="${escapeHtml(event?.ctas?.openEvent || "#")}">Apri evento</a>
        <a href="${escapeHtml(event?.ctas?.createTrill || "#")}">Crea trillo</a>
        <a href="${escapeHtml(event?.ctas?.createPromo || "#")}">Promuovi</a>
        ${
          event.isPrivate
            ? `<a href="${escapeHtml(event?.ctas?.manageAccess || "#")}">Accessi</a>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderMapPlaceholder(events) {
  const withPoint = events.filter((event) => event.point).length;

  return `
    <section class="org-map-canvas" aria-label="Mappa territoriale Organizer">
      <div class="org-map-canvas__inner">
        <p class="org-map-canvas__label">Map Canvas V2</p>
        <h2>${escapeHtml(withPoint)} eventi geolocalizzati</h2>
        <p>
          Skeleton operativo: i marker reali verranno montati nel prossimo step
          sopra questo canvas privacy-safe.
        </p>
      </div>
    </section>
  `;
}

export function renderOrganizerMap(state) {
  const loading = document.querySelector("[data-org-map-loading]");
  const error = document.querySelector("[data-org-map-error]");
  const content = document.querySelector("[data-org-map-content]");

  if (!loading || !error || !content) return;

  loading.hidden = !state.loading;
  error.hidden = !state.error;
  content.hidden = state.loading || Boolean(state.error);

  if (state.error) {
    error.textContent = state.error;
    return;
  }

  const events = getEvents(state);
  const kpis = getKpis(state);
  const privacy = state?.data?.privacy || {};

  content.innerHTML = `
    <section class="org-map-kpis" aria-label="KPI territoriali">
      ${renderKpi("Eventi", kpis.totalEvents, "Totale eventi organizer")}
      ${renderKpi("Critici", kpis.criticalEvents, "Richiedono intervento")}
      ${renderKpi("Azioni", kpis.actionEvents, "Richiedono azione")}
      ${renderKpi("Check-in", kpis.totalCheckIns, "Check-in aggregati")}
      ${renderKpi("Trilli", kpis.totalTrills, "Trilli collegati")}
      ${renderKpi("Promo", kpis.totalPromos, "Promozioni collegate")}
    </section>

    ${renderMapPlaceholder(events)}

    <section class="org-map-grid">
      ${renderLegend()}
      ${renderPrivacyBox(privacy)}
    </section>

    <section class="org-map-panel">
      <div class="org-map-panel__head">
        <h2>Eventi territoriali</h2>
        <p>Cruscotto operativo basato su eventi, metriche e suggerimenti.</p>
      </div>

      <div class="org-map-event-list">
        ${
          events.length
            ? events.map(renderEventCard).join("")
            : `<div class="org-map-empty">Nessun evento disponibile.</div>`
        }
      </div>
    </section>
  `;
    }
