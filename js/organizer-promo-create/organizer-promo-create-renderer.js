// js/organizer-promo-create/organizer-promo-create-renderer.js
// Renderer Organizer Promo Create V2

const VAT_RATE = 0.22;

function euro(value = 0) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

export function renderEventsOptions(select, events = []) {
  if (!select) return;

  select.innerHTML = `
    <option value="">Seleziona evento</option>
    ${events
      .map((event) => {
        const id = event._id || event.id || "";
        const title = event.title || event.nome || "Evento senza titolo";

        return `<option value="${id}">${title}</option>`;
      })
      .join("")}
  `;
}

export function renderEventPreview(elements, event) {
  const { box, image, title, meta } = elements;

  if (!box || !image || !title || !meta) return;

  if (!event) {
    box.hidden = true;
    return;
  }

  const eventTitle = event.title || event.nome || "Evento senza titolo";
  const eventImage =
    event.imageUrl ||
    event.coverImage ||
    event.image ||
    "https://placehold.co/600x300?text=Evento";

  const city = event.city || event.citta || "";
  const region = event.region || "";
  const date = event.dateStart || event.startDate || event.dataStart || "";

  image.src = eventImage;
  image.alt = eventTitle;
  title.textContent = eventTitle;
  meta.textContent = [city, region, date ? new Date(date).toLocaleDateString("it-IT") : ""]
    .filter(Boolean)
    .join(" · ") || "Evento collegato";

  box.hidden = false;
}

export function renderPromoPreview(elements, payload = {}) {
  const { image, title, meta } = elements;

  if (image) {
    image.src =
      payload.imageUrl ||
      "https://placehold.co/600x300?text=Promo";
    image.alt = payload.title || "Anteprima promozione";
  }

  if (title) {
    title.textContent = payload.title || "La tua promozione";
  }

  if (meta) {
    const placement =
      payload.placement === "home_top"
        ? "Home top"
        : "Eventi inline";

    const geo =
      payload.geoScope === "GLOBAL"
        ? "Globale"
        : payload.geoScope === "COUNTRY"
          ? payload.country || "Nazionale"
          : payload.region || "Regionale";

    meta.textContent = `${placement} · ${geo}`;
  }
}

export function renderEstimate(elements, estimate) {
  const { net, vat, gross } = elements;

  if (!estimate || !Number.isFinite(Number(estimate.estimatedPrice))) {
    if (net) net.textContent = "—";
    if (vat) vat.textContent = "—";
    if (gross) gross.textContent = "—";
    return;
  }

  const netAmount = Number(estimate.estimatedPrice || 0);
  const vatAmount = netAmount * VAT_RATE;
  const grossAmount = netAmount + vatAmount;

  if (net) net.textContent = euro(netAmount);
  if (vat) vat.textContent = euro(vatAmount);
  if (gross) gross.textContent = euro(grossAmount);
}

function formatAvailabilityDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function renderDaysList(days = [], emptyText = "") {
  if (!Array.isArray(days) || !days.length) {
    return emptyText ? `<p>${emptyText}</p>` : "";
  }

  return `
    <ul class="org-promo-availability-days">
      ${days
        .map((day) => {
          const label = formatAvailabilityDate(day.date);
          const remaining = Number(day.remaining || 0);
          const capacity = Number(day.capacity || 0);

          return `
            <li>
              <span>${label}</span>
              <small>${remaining} slot liberi su ${capacity}</small>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

export function renderAvailability(box, availability = {}) {
  if (!box) return;

  const safeAvailability = availability || {};
  const status =
  safeAvailability.availabilityLevel ||
  safeAvailability.status ||
  safeAvailability.availabilityStatus ||
  "UNKNOWN";

  const totalDays = Number(safeAvailability.totalDays || 0);
  const availableCount = Number(safeAvailability.availableCount || 0);
  const blockedCount = Number(safeAvailability.blockedCount || 0);
  const limitedCount = Number(safeAvailability.limitedCount || 0);
  const blockedDays = Array.isArray(safeAvailability.blockedDays)
    ? safeAvailability.blockedDays
    : [];
  const limitedDays = Array.isArray(safeAvailability.limitedDays)
    ? safeAvailability.limitedDays
    : [];

  const map = {
    INVALID_GEO_CONFIGURATION: {
      tone: "unavailable",
      title: "Copertura incompleta",
      text: "Per la copertura regionale devi indicare anche la regione.",
    },
    INVALID_DATE_RANGE: {
      tone: "unavailable",
      title: "Periodo non valido",
      text: "La data di fine non può essere precedente alla data di inizio.",
    },
    EVENT_ALREADY_STARTED: {
      tone: "unavailable",
      title: "Periodo non valido",
      text:
        "La promozione non può iniziare in una data già trascorsa.",
    },
    BOOKING_WINDOW_EXCEEDED: {
      tone: "unavailable",
      title: "Periodo non consentito",
      text:
        "La promozione può essere programmata fino a un massimo di 90 giorni in anticipo.",
    },
    PROMO_DURATION_EXCEEDED: {
      tone: "unavailable",
      title: "Durata non consentita",
      text:
        "La promozione non può superare i 30 giorni di durata.",
    },
    MAX_DURATION_EXCEEDED: {
      tone: "unavailable",
      title: "Durata non consentita",
      text:
        "La promozione non può superare i 30 giorni di durata.",
    },
    PROMO_AFTER_EVENT_END: {
      tone: "unavailable",
      title: "Periodo non consentito",
      text: "La promozione non può terminare dopo la fine dell’evento selezionato.",
    },
    COMPLETELY_AVAILABLE: {
      tone: "available",
      title: "Disponibile",
      text: totalDays > 0
        ? `Tutti i ${totalDays} giorni selezionati risultano disponibili.`
        : "Lo spazio promozionale risulta disponibile nel periodo selezionato.",
    },
    PARTIALLY_AVAILABLE: {
      tone: "limited",
      title: "Disponibilità parziale",
      text:
        totalDays > 0
          ? `Disponibili ${availableCount} giorni su ${totalDays}. ${blockedCount ? `${blockedCount} giorni risultano già pieni.` : ""} ${limitedCount ? `${limitedCount} giorni hanno pochi slot residui.` : ""}`.trim()
          : "Il periodo è disponibile, ma alcuni giorni hanno disponibilità ridotta o pochi slot residui.",
    },
    AVAILABLE: {
      tone: "available",
      title: "Disponibilità elevata",
      text: "Lo spazio promozionale risulta disponibile nel periodo selezionato.",
    },
    LOW_AVAILABILITY: {
      tone: "limited",
      title: "Ultimi slot disponibili",
      text:
    totalDays > 0
      ? `Il periodo è disponibile, ma ${limitedCount} giorni hanno pochi slot residui.`
      : "Il periodo è disponibile, ma la disponibilità è ridotta.",
    },
    LIMITED: {
      tone: "limited",
      title: "Disponibilità limitata",
      text: "Sono già presenti altre promozioni. La rotazione potrebbe essere meno frequente.",
    },
    LOW: {
      tone: "low",
      title: "Disponibilità ridotta",
      text: "Gli spazi sono quasi saturi. Valuta date, placement o copertura alternativi.",
    },
    UNAVAILABLE: {
      tone: "unavailable",
      title: "Nessuna disponibilità",
      text:
        totalDays > 0
          ? `Nessuno dei ${totalDays} giorni selezionati ha slot disponibili.`
          : "Nel periodo selezionato gli spazi risultano occupati.",
    },
    UNKNOWN: {
      tone: "unknown",
      title: "Verifica disponibilità",
      text:
        "Completa evento, copertura e date per verificare disponibilità e preventivo.",
    },
  };

  const item = map[status] || map.UNKNOWN;
  const shouldShowBlockedDays =
  ["PARTIALLY_AVAILABLE", "UNAVAILABLE"].includes(status) &&
  blockedDays.length > 0;
const shouldShowLimitedDays =
  ["PARTIALLY_AVAILABLE", "LOW_AVAILABILITY"].includes(status) &&
  limitedDays.length > 0;

  box.dataset.tone = item.tone;
  box.innerHTML = `
    <strong>${item.title}</strong>
    <p>${item.text}</p>

    ${
      shouldShowBlockedDays
        ? `
          <div class="org-promo-availability-detail">
            <b>Giorni non disponibili</b>
            ${renderDaysList(blockedDays)}
          </div>
        `
        : ""
    }

    ${
      shouldShowLimitedDays
        ? `
          <div class="org-promo-availability-detail">
            <b>Giorni con pochi slot residui</b>
            ${renderDaysList(limitedDays)}
          </div>
        `
        : ""
    }
  `;
}
function getDemandLabel(value) {
  const map = {
    CALM: "Tranquilla",
    ACTIVE: "Attiva",
    COMPETITIVE: "Competitiva",
    INTENSE: "Molto richiesta",
    LOW: "Bassa",
    MEDIUM: "Media",
    HIGH: "Alta",
    VERY_HIGH: "Molto alta",
  };

  return map[value] || "In valutazione";
}

function getDemandTone(demand = {}) {
  const pressure = demand.periodPressure || demand.scarcityLevel || demand.demandLevel;

  if (pressure === "VERY_HIGH" || pressure === "INTENSE") return "very-high";
  if (pressure === "HIGH" || pressure === "COMPETITIVE") return "high";
  if (pressure === "MEDIUM" || pressure === "ACTIVE") return "medium";

  return "low";
}

export function renderDemand(box, demand = null) {
  if (!box) return;

  if (!demand) {
    box.dataset.tone = "unknown";
    box.innerHTML = `<strong>Analisi del periodo</strong>
    <p>Seleziona le date per valutare quanto il periodo scelto è già richiesto da altre promozioni.</p>`;
    return;
  }

  const score = Math.max(0, Math.min(Number(demand.competitionScore || 0), 100));
  const demandLabel = getDemandLabel(demand.demandLevel);
  const pressureLabel = getDemandLabel(demand.periodPressure);
  const message =
    demand.message ||
    "La pressione promozionale del periodo è stata analizzata in base agli slot già occupati.";

  box.dataset.tone = getDemandTone(demand);
  box.innerHTML = `
    <strong>${demandLabel}</strong>
    <p>${message}</p>

    <div class="org-promo-demand-meter" aria-label="Pressione promozionale ${score} su 100">
      <span style="width:${score}%"></span>
    </div>

    <div class="org-promo-demand-meta">
      <span>Pressione: <b>${pressureLabel}</b></span>
      <span>Indice: <b>${score}/100</b></span>
    </div>
  `;
}
function formatSuggestionDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getSuggestionTone(suggestions = {}) {
  const status = suggestions.status || "NEUTRAL";

  if (status === "HAS_BETTER_WINDOW") return "window";
  if (status === "TRILL_STRATEGY") return "trill";
  if (status === "MICRO_OPTIMIZATION") return "soft";

  return "neutral";
}

function renderSuggestionItem(item = {}) {
  if (item.type === "BETTER_WINDOW") {
    const from = formatSuggestionDate(item.activeFrom);
const to = formatSuggestionDate(item.activeTo);
const rangeLabel = from && to ? `Dal ${from} al ${to}` : `${from} → ${to}`;

    return `
  <article class="org-promo-suggestion-item org-promo-suggestion-window">
    <span>Periodo consigliato</span>
    <strong>${rangeLabel}</strong>
    <p>Disponibilità completa e pressione promozionale più favorevole.</p>
  </article>
`;
  }

  return `
    <article class="org-promo-suggestion-item">
      <span>${item.type === "TRILL_SUPPORT" ? "Supporto live consigliato" : "Ottimizzazione"}</span>
      <p>${item.message || ""}</p>
    </article>
  `;
}

export function renderSuggestions(card, box, suggestions = null) {
  if (!card || !box) return;

  const status = suggestions?.status || "NEUTRAL";

  if (!suggestions || status === "NEUTRAL") {
    card.hidden = true;
    box.dataset.tone = "neutral";
    box.innerHTML = "";
    return;
  }

  const title = suggestions.title || "Suggerimento strategico";
  let message =
  suggestions.message ||
  "Il sistema ha individuato un suggerimento utile per valorizzare la promozione.";

if (status === "HAS_BETTER_WINDOW") {
  message =
    "La prima parte del periodo selezionato risulta particolarmente richiesta. Abbiamo individuato una finestra successiva, sempre entro la durata dell’evento, con condizioni più favorevoli per la visibilità.";
}

  const items = Array.isArray(suggestions.items) ? suggestions.items : [];
  const trillMessage = suggestions?.trillFallback?.recommended
    ? suggestions.trillFallback.message
    : "";

  card.hidden = false;
  box.dataset.tone = getSuggestionTone(suggestions);
  box.innerHTML = `
    <div class="org-promo-suggestion-kicker">Analisi del periodo</div>
    <strong>${title}</strong>
    <p>${message}</p>

    ${
      items.length
        ? `
          <div class="org-promo-suggestion-items">
            ${items.map(renderSuggestionItem).join("")}
          </div>
        `
        : ""
    }

    ${
      trillMessage
        ? `
          <div class="org-promo-suggestion-note">
            ${trillMessage}
          </div>
        `
        : ""
    }
  `;
}
function normalizeAdvisorText(value, fallback = "") {
  return String(value || fallback || "").trim();
}

function renderAdvisorAction(action = {}, { secondary = false } = {}) {
  const label = normalizeAdvisorText(action.label, secondary ? "Azione" : "Applica strategia");
  const encoded = encodeURIComponent(JSON.stringify(action || {}));

  return `
    <button
      type="button"
      class="${secondary ? "org-promo-advisor-secondary-action" : "org-promo-advisor-primary-action"}"
      data-promo-advisor-action="${encoded}"
    >
      ${label}
    </button>
  `;
}

function renderAdvisorAlternative(strategy = {}) {
  const title = normalizeAdvisorText(strategy.title, "Strategia alternativa");
  const summary = normalizeAdvisorText(strategy.summary);
  const reason = normalizeAdvisorText(strategy.reason);
  const primaryAction = strategy.primaryAction
    ? renderAdvisorAction(strategy.primaryAction, { secondary: true })
    : "";

  return `
    <article class="org-promo-advisor-alternative">
      <span>Strategia alternativa</span>
      <strong>${title}</strong>
      ${summary ? `<p>${summary}</p>` : ""}
      ${reason ? `<p>${reason}</p>` : ""}
      ${primaryAction ? `<div class="org-promo-advisor-actions">${primaryAction}</div>` : ""}
    </article>
  `;
}
function renderCampaignAdvisorItems(items = [], label = "Segnali storici") {
  if (!Array.isArray(items) || !items.length) return "";

  return `
    <div class="org-promo-campaign-advisor-group">
      <span>${label}</span>
      <div class="org-promo-campaign-advisor-list">
        ${items
          .slice(0, 4)
          .map((item) => {
            const title = normalizeAdvisorText(item.title, "Segnale storico");
            const message = normalizeAdvisorText(item.message);
            const source =
              item.source === "personal"
                ? "Storico personale"
                : item.source === "collective"
                  ? "Dati collettivi"
                  : "Storico campagne";

            return `
              <article class="org-promo-campaign-advisor-item" data-level="${normalizeAdvisorText(item.level, "info")}">
                <small>${source}</small>
                <strong>${title}</strong>
                ${message ? `<p>${message}</p>` : ""}
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderCampaignAdvisor(campaignAdvisor = null) {
  if (!campaignAdvisor?.ui?.visible) return "";

  const title = normalizeAdvisorText(
    campaignAdvisor.ui.title,
    "Consulente storico campagne"
  );

  const subtitle = normalizeAdvisorText(
    campaignAdvisor.ui.subtitle,
    "Suggerimenti basati sullo storico reale delle campagne."
  );

  const confidence = normalizeAdvisorText(campaignAdvisor.confidence, "none");
  const personalSample = Number(campaignAdvisor.sampleSize?.personal || 0);
  const collectiveSample = Number(campaignAdvisor.sampleSize?.collective || 0);

  const recommendations = Array.isArray(campaignAdvisor.recommendations)
    ? campaignAdvisor.recommendations
    : [];

  const opportunities = Array.isArray(campaignAdvisor.opportunities)
    ? campaignAdvisor.opportunities
    : [];

  const warnings = Array.isArray(campaignAdvisor.warnings)
    ? campaignAdvisor.warnings
    : [];

  return `
    <section class="org-promo-campaign-advisor" data-priority="${normalizeAdvisorText(campaignAdvisor.ui.priority, "info")}">
      <div class="org-promo-campaign-advisor-head">
        <div>
          <div class="org-promo-advisor-kicker">Secondo cervello · memoria campagne</div>
          <strong>${title}</strong>
          <p>${subtitle}</p>
        </div>

        <div class="org-promo-campaign-advisor-meta">
          <span>Affidabilità: <b>${confidence}</b></span>
          <span>Storico: <b>${personalSample}</b> personale · <b>${collectiveSample}</b> collettivo</span>
        </div>
      </div>

      ${renderCampaignAdvisorItems(recommendations, "Raccomandazioni")}
      ${renderCampaignAdvisorItems(opportunities, "Opportunità")}
      ${renderCampaignAdvisorItems(warnings, "Avvisi")}
    </section>
  `;
}
function renderAdvisorFactors(factors = []) {
  if (!Array.isArray(factors) || !factors.length) return "";

  return `
    <div class="org-promo-advisor-factors">
      <span>Fattori rilevati</span>
      <ul>
        ${factors
          .map((factor) => `<li>${normalizeAdvisorText(factor.label)}</li>`)
          .join("")}
      </ul>
    </div>
  `;
}

export function renderAdvisor(card, box, advisor = null, campaignAdvisor = null) {
  if (!card || !box) return;

  const primaryStrategy = advisor?.primaryStrategy || null;
  const campaignAdvisorHtml = renderCampaignAdvisor(campaignAdvisor);

  if ((!advisor || !primaryStrategy) && !campaignAdvisorHtml) {
    card.hidden = true;
    box.innerHTML = "";
    return;
  }

  const title = normalizeAdvisorText(primaryStrategy?.title, "Strategia consigliata");
  const summary = normalizeAdvisorText(primaryStrategy?.summary);
  const reason = normalizeAdvisorText(primaryStrategy?.reason);
  const primaryAction = primaryStrategy?.primaryAction
    ? renderAdvisorAction(primaryStrategy.primaryAction || {})
    : "";

  const detectedFactors = Array.isArray(advisor?.detectedFactors)
    ? advisor.detectedFactors
    : [];

  const alternativeStrategies = Array.isArray(advisor?.alternativeStrategies)
    ? advisor.alternativeStrategies
    : [];

  card.hidden = false;
  box.dataset.level = normalizeAdvisorText(primaryStrategy?.level, "SOFT").toLowerCase();

  box.innerHTML = `
    ${
      primaryStrategy
        ? `
          <section class="org-promo-operational-advisor">
            <div class="org-promo-advisor-kicker">Primo cervello · strategia operativa</div>
            <strong>${title}</strong>
            ${summary ? `<p>${summary}</p>` : ""}
            ${
              reason
                ? `
                  <div class="org-promo-advisor-reason">
                    <span>Perché questa strategia</span>
                    <p>${reason}</p>
                  </div>
                `
                : ""
            }
            ${renderAdvisorFactors(detectedFactors)}

            <div class="org-promo-advisor-actions">
              ${primaryAction}
              ${
                alternativeStrategies.length
                  ? `<button type="button" class="org-promo-advisor-toggle" data-promo-advisor-toggle>Mostra strategie alternative</button>`
                  : ""
              }
            </div>

            ${
              alternativeStrategies.length
                ? `
                  <div class="org-promo-advisor-alternatives" data-promo-advisor-alternatives hidden>
                    ${alternativeStrategies.map(renderAdvisorAlternative).join("")}
                  </div>
                `
                : ""
            }
          </section>
        `
        : ""
    }

    ${campaignAdvisorHtml}
  `;
}

export function showMessage(el, message) {
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}
