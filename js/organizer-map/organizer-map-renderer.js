function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function filterEvents(events, filter) {
  const now = Date.now();

  if (filter === "all") return events;

  if (filter === "critical") {
    return events.filter(
      (event) => event?.operationalStatus?.level === "critical"
    );
  }

  if (filter === "action") {
    return events.filter(
      (event) => event?.operationalStatus?.level === "action"
    );
  }

  if (filter === "operational") {
    return events.filter((event) =>
      ["critical", "action", "monitor"].includes(
        event?.operationalStatus?.level
      )
    );
  }

  if (filter === "live") {
    return events.filter((event) => {
      const start = new Date(event.dateStart).getTime();
      const end = new Date(event.dateEnd).getTime();
      return start <= now && end >= now;
    });
  }

  if (filter === "upcoming") {
    return events.filter((event) => {
      const start = new Date(event.dateStart).getTime();
      return start > now;
    });
  }

  if (filter === "past") {
    return events.filter((event) => {
      const end = new Date(event.dateEnd).getTime();
      return end < now;
    });
  }

  return events;
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

const MAP_FILTERS = [
  {
    value: "operational",
    label: "Operativi",
    hint: "Critici, da monitorare o con azioni consigliate",
  },
  { value: "live", label: "In corso", hint: "Eventi attivi ora" },
  { value: "upcoming", label: "Imminenti", hint: "Eventi futuri" },
  { value: "past", label: "Passati", hint: "Storico eventi" },
  { value: "critical", label: "Critici", hint: "Intervento urgente" },
  { value: "action", label: "Azione", hint: "Serve intervento" },
  { value: "all", label: "Tutti", hint: "Tutti gli eventi" },
];

function getFilterLabel(filter) {
  return (
    MAP_FILTERS.find((item) => item.value === filter)?.label || "Operativi"
  );
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

function renderMapFilters(activeFilter, total, visible) {
  return `
    <section class="org-map-filter-panel" aria-label="Filtri mappa organizer">
      <div class="org-map-filter-panel__head">
        <div>
          <h2>Vista territoriale</h2>
          <p>${escapeHtml(visible)} di ${escapeHtml(total)} eventi · filtro ${escapeHtml(
    getFilterLabel(activeFilter)
  )}</p>
        </div>
      </div>

      <div class="org-map-filters">
        ${MAP_FILTERS.map((filter) => {
          const active = filter.value === activeFilter;

          return `
            <button
              type="button"
              class="org-map-filter ${active ? "is-active" : ""}"
              data-org-map-filter="${filter.value}"
              title="${escapeHtml(filter.hint)}"
              aria-pressed="${active ? "true" : "false"}"
            >
              ${escapeHtml(filter.label)}
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderLegend() {
  return `
    <section class="org-map-panel">
      <div class="org-map-panel__head">
        <h2>Legenda operativa</h2>
        <p>Colori e stati aiutano a capire dove intervenire prima.</p>
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
        <h2>Dati protetti</h2>
        <p>${escapeHtml(getPrivacyModeLabel(privacy?.mode))}</p>
      </div>

      <div class="org-map-privacy-list">
        <span>Identità utenti: ${
          privacy?.exposesUserCoordinates ? "esposte" : "non esposte"
        }</span>
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
  const pointLabel = getAreaLabel(event);

  return `
    <article class="org-map-event-card org-map-event-card--${level}">
      <div class="org-map-event-card__head">
        <div>
          <h3>${escapeHtml(event.title || "Evento senza titolo")}</h3>
          <p>${escapeHtml(event.city || event.region || "Luogo non indicato")} · ${escapeHtml(
    formatDate(event.dateStart)
  )}</p>
        </div>

        <span class="org-map-status org-map-status--${level}">
          ${escapeHtml(event?.operationalStatus?.label || "Ok")}
        </span>
      </div>

      <div class="org-map-event-card__meta">
        <span>${event.isPrivate ? "Privato" : "Pubblico"}</span>
        <span>${escapeHtml(getApprovalLabel(event.approvalStatus))}</span>
        <span>${escapeHtml(pointLabel)}</span>
      </div>

      <div class="org-map-metrics">
        <span><strong>${escapeHtml(
          event?.metrics?.checkInsCount || 0
        )}</strong> check-in</span>
        <span><strong>${escapeHtml(
          event?.metrics?.promosCount || 0
        )}</strong> promo</span>
      </div>

      <p class="org-map-reason">
        ${escapeHtml(event?.operationalStatus?.reason || "Evento operativo.")}
      </p>

      ${
        event?.suggestions?.length
          ? `<ul class="org-map-suggestions">${event.suggestions
              .map(renderSuggestion)
              .join("")}</ul>`
          : ""
      }

      <div class="org-map-actions">
        <a href="${escapeHtml(event?.ctas?.openEvent || "#")}">Apri evento</a>
        <a href="${escapeHtml(event?.ctas?.createTrill || "#")}">Crea trillo</a>
        <a href="${escapeHtml(event?.ctas?.createPromo || "#")}">Promuovi</a>
        ${
          event.isPrivate
            ? `<a href="${escapeHtml(
                event?.ctas?.manageAccess || "#"
              )}">Accessi</a>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderMapPlaceholder(events) {
  const withPoint = events.filter((event) => event.point).length;

  return `
    <section class="org-map-canvas" aria-label="Mappa territoriale organizer">
      <div
        class="org-map-leaflet"
        data-org-map-leaflet
        data-org-map-count="${escapeHtml(withPoint)}"
      ></div>
    </section>
  `;
}

export function getVisibleOrganizerMapEvents(state) {
  return filterEvents(getEvents(state), state.filter);
}

export function renderSelectedOrganizerMapEvent(state) {
  const panel = document.querySelector("[data-org-map-selected-panel]");
  const target = document.querySelector("[data-org-map-selected-event]");

  if (!panel || !target) return;

  const events = getVisibleOrganizerMapEvents(state);
  const selectedEvent = events.find(
    (event) => event.id === state.selectedEventId
  );

  panel.hidden = !selectedEvent;

  target.innerHTML = selectedEvent
    ? renderEventCard(selectedEvent)
    : `<div class="org-map-empty">Nessun evento selezionato.</div>`;
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

  const rawEvents = getEvents(state);
  const events = filterEvents(rawEvents, state.filter);
  const kpis = getKpis(state);
  const privacy = state?.data?.privacy || {};

  content.innerHTML = `
    <section class="org-map-kpis" aria-label="KPI territoriali">
      ${renderKpi("Eventi", kpis.totalEvents, "Totale eventi organizer")}
      ${renderKpi("Azioni", kpis.actionEvents, "Richiedono azione")}
      ${renderKpi("Trilli", kpis.totalTrills, "Trilli collegati")}
      ${renderKpi("Promo", kpis.totalPromos, "Promozioni collegate")}
    </section>

    ${renderMapFilters(state.filter, rawEvents.length, events.length)}

    ${renderMapPlaceholder(events)}

    <section class="org-map-grid">
      ${renderLegend()}
      ${renderPrivacyBox(privacy)}
    </section>

    <section class="org-map-panel" data-org-map-selected-panel ${
      state.selectedEventId ? "" : "hidden"
    }>
      <div class="org-map-panel__head">
        <h2>Evento selezionato</h2>
        <p>Dettaglio operativo dell’evento scelto sulla mappa.</p>
      </div>

      <div class="org-map-event-list" data-org-map-selected-event>
        ${
          events.length
            ? events
                .filter((event) => event.id === state.selectedEventId)
                .map(renderEventCard)
                .join("")
            : `<div class="org-map-empty">Nessun evento disponibile.</div>`
        }
      </div>
    </section>
  `;
    }
