// js/organizer-promos/organizer-promos-renderer.js
// Renderer Promozioni Organizer V2

const VAT_RATE = 0.22;

const STATUS_MAP = {
  DRAFT: {
    label: "Bozza",
    tone: "paused",
  },

  PENDING_REVIEW: {
    label: "In revisione",
    tone: "review",
  },

  PENDING_PAYMENT: {
    label: "In attesa pagamento",
    tone: "payment",
  },

  ACTIVE: {
    label: "Attiva",
    tone: "active",
  },

  SCHEDULED: {
    label: "Programmata",
    tone: "scheduled",
  },

  PAUSED: {
    label: "In pausa",
    tone: "paused",
  },

  ENDED: {
    label: "Terminata",
    tone: "ended",
  },

  REJECTED: {
    label: "Rifiutata",
    tone: "rejected",
  },

  CANCELLED: {
    label: "Annullata",
    tone: "ended",
  },

  INVALIDATED_BY_EVENT_CHANGE: {
    label: "Da rivalutare",
    tone: "rejected",
  },
};

const PLACEMENT_LABELS = {
  home_top: "Home top",
  events_list_inline: "Eventi inline",
};

function euro(value = 0) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDateRange(from, to) {
  if (!from || !to) return "—";

  try {
    const start = new Date(from);
const end = new Date(to);
end.setUTCDate(end.getUTCDate() - 1);

return `${start.toLocaleDateString("it-IT")} → ${end.toLocaleDateString("it-IT")}`;
  } catch {
    return "—";
  }
}

function getGeoLabel(item) {
  if (item.geoScope === "GLOBAL") {
    return "Globale";
  }

  if (item.geoScope === "COUNTRY") {
    return item.country || "Nazionale";
  }

  return item.region || "Regionale";
}
function getEventLabel(eventId) {
if (!eventId) return "—";

if (typeof eventId === "object") {
return (
eventId.title ||
eventId.nome ||
eventId._id ||
eventId.id ||
"Evento collegato"
);
}

return eventId;
}
function normalizePromo(raw = {}) {
  const estimatedPrice = Number(raw.estimatedPrice || 0);

  const vatAmount = estimatedPrice * VAT_RATE;
  const grossTotal = estimatedPrice + vatAmount;

  const status =
    STATUS_MAP[raw.status] || {
      label: raw.status || "Sconosciuto",
      tone: "paused",
    };

  const impressions = Number(raw.impressionsTotal || 0);
  const clicks = Number(raw.clicksTotal || 0);

  const ctr =
    impressions > 0
      ? ((clicks / impressions) * 100).toFixed(1)
      : "0.0";

  return {
    id: raw._id || raw.id || "",
    eventId: raw.eventId || null,
    eventLabel: getEventLabel(raw.eventId),

    title: raw.title || "Promozione senza titolo",

    imageUrl:
      raw.imageUrl ||
      "https://placehold.co/600x300?text=Promo",

    placement:
      PLACEMENT_LABELS[raw.placement] ||
      raw.placement ||
      "—",

    geoLabel: getGeoLabel(raw),

    periodLabel: formatDateRange(
      raw.activeFrom,
      raw.activeTo
    ),

    status: raw.status,
    statusLabel: status.label,
    statusTone: status.tone,

    paymentStatus: raw.paymentStatus || null,

    estimatedPrice,
    vatAmount,
    grossTotal,

    impressions,
    clicks,
    ctr,
  };
}

function buildActions(item) {
  const detailHref = `/pages/organizer-promo-detail-v2.html?id=${encodeURIComponent(item.id)}`;

  switch (item.status) {
    case "PENDING_REVIEW":
      return `
        <a
          class="org-promos-card__action"
          href="${detailHref}"
        >
          Visualizza dettagli
        </a>

        <button
          class="org-promos-card__action org-promos-card__action--danger"
          type="button"
          data-org-promos-withdraw
          data-promo-id="${item.id}"
          data-promo-title="${item.title}"
          title="Ritira questa richiesta prima della revisione admin"
        >
          Annulla richiesta
        </button>
      `;

    case "PENDING_PAYMENT":
      return `
        <a
          class="org-promos-card__action org-promos-card__action--primary"
          href="${detailHref}"
          title="Apri il riepilogo pagamento. Il checkout reale sarà collegato in una fase successiva."
        >
          Completa pagamento
        </a>

        <a
          class="org-promos-card__action"
          href="${detailHref}"
        >
          Dettagli preventivo
        </a>
      `;

    case "ACTIVE":
    case "SCHEDULED":
      return `
        <a
          class="org-promos-card__action org-promos-card__action--primary"
          href="${detailHref}"
        >
          Visualizza dettagli
        </a>

        <button
          class="org-promos-card__action"
          type="button"
          disabled
          title="Le statistiche avanzate saranno abilitate con l’endpoint dedicato"
        >
          Statistiche
        </button>

        <button
          class="org-promos-card__action"
          type="button"
          disabled
          title="La duplicazione promo sarà abilitata con il prossimo endpoint dedicato"
        >
          Duplica promo
        </button>
      `;

    case "ENDED":
      return `
        <a
          class="org-promos-card__action org-promos-card__action--primary"
          href="${detailHref}"
        >
          Visualizza dettagli
        </a>

        <button
          class="org-promos-card__action"
          type="button"
          disabled
          title="La funzione Ripromuovi sarà abilitata con il prossimo endpoint dedicato"
        >
          Ripromuovi
        </button>

        <button
          class="org-promos-card__action"
          type="button"
          disabled
          title="Le statistiche avanzate saranno abilitate con l’endpoint dedicato"
        >
          Statistiche
        </button>
      `;

    case "REJECTED":
return `<a class="org-promos-card__action" href="${detailHref}">
Vedi motivo
</a>

<a
class="org-promos-card__action org-promos-card__action--primary"
href="/pages/organizer-promo-create-v2.html?mode=revalidate&id=${encodeURIComponent(item.id)}"
title="Aggiorna la promozione e inviala di nuovo in revisione"
>
Modifica e reinvia
</a>`;
   case "INVALIDATED_BY_EVENT_CHANGE":
      return `
        <a
          class="org-promos-card__action org-promos-card__action--primary"
          href="${detailHref}"
        >
          Visualizza dettagli
        </a>

        <button
          class="org-promos-card__action"
          type="button"
          disabled
          title="Le date dell’evento sono cambiate: questa promozione richiede una rivalutazione."
        >
          Richiede revisione
        </button>
      `; 
    default:
      return `
        <a
          class="org-promos-card__action"
          href="${detailHref}"
        >
          Visualizza dettagli
        </a>
      `;
  }
}
export function renderPromos(root, promos = []) {
  if (!root) return;

  const items = promos.map(normalizePromo);

  root.innerHTML = items
    .map(
      (item) => `
      <article class="org-promos-card">
        <div class="org-promos-card__media">
          <img
            src="${item.imageUrl}"
            alt="${item.title}"
            loading="lazy"
          />
        </div>

        <div class="org-promos-card__body">
          <div class="org-promos-card__top">
            <div>
              <h2 class="org-promos-card__title">
                ${item.title}
              </h2>

              <div class="org-promos-card__event">
                Evento: ${item.eventLabel || "—"}
              </div>
            </div>

            <span
              class="org-promos-badge org-promos-badge--${item.statusTone}"
            >
              ${item.statusLabel}
            </span>
          </div>

          <div class="org-promos-card__meta">
            <span>📅 ${item.periodLabel}</span>
            <span>📍 ${item.geoLabel}</span>
            <span>📣 ${item.placement}</span>
          </div>

          <div class="org-promos-card__commercial">
            <span>
              Preventivo:
              <strong>${euro(item.estimatedPrice)}</strong>
            </span>

            <span>
              IVA:
              <strong>${euro(item.vatAmount)}</strong>
            </span>

            <span>
              Totale:
              <strong>${euro(item.grossTotal)}</strong>
            </span>
          </div>

          <div class="org-promos-card__stats">
            <span>👁 ${item.impressions}</span>
            <span>🖱 ${item.clicks}</span>
            <span>CTR ${item.ctr}%</span>
          </div>

          <div class="org-promos-card__actions">
            ${buildActions(item)}
          </div>
        </div>
      </article>
    `
    )
    .join("");
    }
