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

export function renderAvailability(box, availability = {}) {
  if (!box) return;

  const safeAvailability = availability || {};
  const status =
    safeAvailability.availabilityStatus ||
    safeAvailability.status ||
    "UNKNOWN";

  const map = {
    INVALID_DATE_RANGE: {
      tone: "unavailable",
      title: "Periodo non valido",
      text: "La data/ora di fine deve essere successiva alla data/ora di inizio.",
    },
    PROMO_AFTER_EVENT_END: {
      tone: "unavailable",
      title: "Periodo non consentito",
      text: "La promozione non può terminare dopo la fine dell’evento selezionato.",
    },
    COMPLETELY_AVAILABLE: {
      tone: "available",
      title: "Disponibile",
      text: "Lo spazio promozionale risulta disponibile nel periodo selezionato.",
    },
    PARTIALLY_AVAILABLE: {
      tone: "limited",
      title: "Disponibilità parziale",
      text: "Alcuni giorni del periodo selezionato risultano saturi o con disponibilità ridotta. Valuta date alternative o un periodo più breve.",
    },
    AVAILABLE: {
      tone: "available",
      title: "Disponibilità elevata",
      text: "Lo spazio promozionale risulta disponibile nel periodo selezionato.",
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
      text: "Nel periodo selezionato gli spazi risultano occupati.",
    },
    UNKNOWN: {
      tone: "unknown",
      title: "Verifica disponibilità",
      text: "La disponibilità live sarà verificata quando il motore availability sarà attivo.",
    },
  };

  const item = map[status] || map.UNKNOWN;

  box.dataset.tone = item.tone;
  box.innerHTML = `
    <strong>${item.title}</strong>
    <p>${item.text}</p>
  `;
}

export function showMessage(el, message) {
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}
