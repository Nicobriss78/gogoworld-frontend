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

export function showMessage(el, message) {
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}
