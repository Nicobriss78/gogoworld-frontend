// js/organizer-promo-detail/organizer-promo-detail-renderer.js
// Renderer Organizer Promo Detail V2

const VAT_RATE = 0.22;

const STATUS_MAP = {
  DRAFT: { label: "Bozza", tone: "paused" },
  PENDING_REVIEW: { label: "In revisione", tone: "review" },
  PENDING_PAYMENT: { label: "In attesa pagamento", tone: "payment" },
  SCHEDULED: { label: "Programmata", tone: "scheduled" },
  ACTIVE: { label: "Attiva", tone: "active" },
  PAUSED: { label: "In pausa", tone: "paused" },
  ENDED: { label: "Terminata", tone: "ended" },
  REJECTED: { label: "Rifiutata", tone: "rejected" },
  CANCELLED: { label: "Annullata", tone: "ended" },
  INVALIDATED_BY_EVENT_CHANGE: { label: "Da rivalutare", tone: "rejected" },
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

function dateLabel(value, options = {}) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  if (options.exclusiveEnd) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return date.toLocaleDateString("it-IT");
}

function dateTimeLabel(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function periodLabel(item = {}) {
  return `${dateLabel(item.activeFrom)} → ${dateLabel(item.activeTo, { exclusiveEnd: true })}`;
}

function statusInfo(status) {
  return STATUS_MAP[status] || {
    label: status || "Sconosciuto",
    tone: "paused",
  };
}

function placementLabel(placement) {
  return PLACEMENT_LABELS[placement] || placement || "—";
}

function geoLabel(item = {}) {
  if (item.geoScope === "GLOBAL") return "Globale";
  if (item.geoScope === "COUNTRY") return item.country || "Nazionale";
  return item.region || "Regionale";
}

function getId(item = {}) {
  return item._id || item.id || "";
}

function getImage(item = {}) {
  return item.imageUrl || "https://placehold.co/900x500?text=Promo";
}

function getCommercial(item = {}) {
  const raw = item.estimatedPrice;

  if (raw === undefined || raw === null || Number(raw) <= 0) {
    return {
      available: false,
      net: 0,
      vat: 0,
      gross: 0,
    };
  }

  const net = Number(raw || 0);
  const vat = net * VAT_RATE;

  return {
    available: true,
    net,
    vat,
    gross: net + vat,
  };
}

function getCtr(item = {}) {
  const impressions = Number(item.impressionsTotal || 0);
  const clicks = Number(item.clicksTotal || 0);

  if (!impressions) return "0.0";

  return ((clicks / impressions) * 100).toFixed(1);
}

function paymentLabel(value) {
  const map = {
    NOT_REQUIRED: "Non richiesto",
    PENDING: "In attesa",
    PAID: "Pagato",
    FAILED: "Fallito",
    REFUNDED: "Rimborsato",
  };

  return map[value] || value || "—";
}

function timelineForStatus(status) {
  const base = [
    {
      key: "created",
      title: "Richiesta creata",
      text: "La richiesta promozione è stata registrata.",
    },
    {
      key: "review",
      title: "In revisione",
      text: "L’admin verifica contenuto, periodo e compatibilità commerciale.",
    },
    {
      key: "payment",
      title: "In attesa pagamento",
      text: "Dopo l’approvazione, sarà richiesto il pagamento.",
    },
    {
      key: "publish",
      title: "Pubblicazione",
      text: "La promozione viene programmata o attivata.",
    },
    {
      key: "ended",
      title: "Terminata",
      text: "La promozione ha concluso il periodo previsto.",
    },
  ];

  const activeByStatus = {
    DRAFT: "created",
    PENDING_REVIEW: "review",
    PENDING_PAYMENT: "payment",
    SCHEDULED: "publish",
    ACTIVE: "publish",
    PAUSED: "publish",
    ENDED: "ended",
  };
  if (status === "SCHEDULED") {
return [
{
key: "created",
title: "Richiesta creata",
text: "La richiesta promozione è stata registrata.",
state: "done",
},
{
key: "review",
title: "Revisione completata",
text: "La promozione è stata approvata.",
state: "done",
},
{
key: "payment",
title: "Pagamento completato",
text: "Il pagamento è stato registrato.",
state: "done",
},
{
key: "publish",
title: "Promozione programmata",
text: "La promozione partirà nel periodo previsto.",
state: "active",
},
{
key: "ended",
title: "Terminata",
text: "La promozione non ha ancora concluso il periodo previsto.",
state: "pending",
},
];
}

if (status === "ACTIVE") {
return [
{
key: "created",
title: "Richiesta creata",
text: "La richiesta promozione è stata registrata.",
state: "done",
},
{
key: "review",
title: "Revisione completata",
text: "La promozione è stata approvata.",
state: "done",
},
{
key: "payment",
title: "Pagamento completato",
text: "Il pagamento è stato registrato.",
state: "done",
},
{
key: "publish",
title: "Promozione attiva",
text: "La promozione è attualmente pubblicata.",
state: "active",
},
{
key: "ended",
title: "Terminata",
text: "La promozione non ha ancora concluso il periodo previsto.",
state: "pending",
},
];
}

if (status === "ENDED") {
return [
{
key: "created",
title: "Richiesta creata",
text: "La richiesta promozione è stata registrata.",
state: "done",
},
{
key: "review",
title: "Revisione completata",
text: "La promozione è stata approvata.",
state: "done",
},
{
key: "payment",
title: "Pagamento completato",
text: "Il pagamento è stato registrato.",
state: "done",
},
{
key: "publish",
title: "Pubblicazione completata",
text: "La promozione è stata pubblicata nel periodo previsto.",
state: "done",
},
{
key: "ended",
title: "Terminata",
text: "La promozione ha concluso il periodo previsto.",
state: "active",
},
];
}
  if (status === "REJECTED") {
    return base.map((step) => ({
      ...step,
      state:
        step.key === "review"
          ? "blocked"
          : step.key === "created"
            ? "done"
            : "pending",
    }));
  }
if (status === "CANCELLED") {
    return [
      {
        key: "created",
        title: "Richiesta creata",
        text: "La richiesta promozione è stata registrata.",
        state: "done",
      },
      {
        key: "review",
        title: "In revisione",
        text: "La richiesta era in attesa di verifica admin.",
        state: "pending",
      },
      {
        key: "cancelled",
        title: "Richiesta annullata",
        text: "La promozione è stata ritirata dall’organizzatore prima della revisione admin.",
        state: "blocked",
      },
    ];
  }
  if (status === "INVALIDATED_BY_EVENT_CHANGE") {
    return [
      {
        key: "created",
        title: "Richiesta creata",
        text: "La richiesta promozione è stata registrata.",
        state: "done",
      },
      {
        key: "event_changed",
        title: "Date evento modificate",
        text: "Le date dell’evento collegato sono cambiate dopo la creazione della promozione.",
        state: "blocked",
      },
      {
        key: "review_needed",
        title: "Da rivalutare",
        text: "Questa promozione deve essere rivalutata prima di poter proseguire.",
        state: "blocked",
      },
    ];
  }
  const order = base.map((step) => step.key);
  const active = activeByStatus[status] || "created";
  const activeIndex = order.indexOf(active);

  return base.map((step, index) => ({
    ...step,
    state:
      index < activeIndex
        ? "done"
        : index === activeIndex
          ? "active"
          : "pending",
  }));
}

function actionsForStatus(status) {
  switch (status) {
    case "PENDING_REVIEW":
      return [
        {
          label: "Modifica richiesta",
          tone: "secondary",
          disabled: true,
          title: "La modifica richiesta sarà abilitata con il prossimo endpoint dedicato.",
        },
        {
          label: "Annulla richiesta",
          tone: "danger",
          disabled: false,
          action: "withdraw",
          title: "Ritira questa richiesta prima della revisione admin.",
        },
      ];

    case "PENDING_PAYMENT":
      return [
        {
          label: "Pagamento test",
          tone: "primary",
          disabled: false,
          action: "pay-test",
          title: "Simula il pagamento in ambiente test. Il checkout reale sarà collegato in una fase successiva.",
        },
        {
          label: "Dettagli preventivo",
          tone: "secondary",
          disabled: true,
          title: "Il preventivo è già visibile nel riepilogo commerciale.",
        },
      ];

    case "SCHEDULED":
case "ACTIVE":
return [
{
label: "Statistiche disponibili a breve",
tone: "secondary",
disabled: true,
title: "Le statistiche avanzate saranno abilitate con l’endpoint dedicato.",
},
{
label: "Duplicazione disponibile a breve",
tone: "secondary",
disabled: true,
title: "La duplicazione promo sarà abilitata con il prossimo endpoint dedicato.",
},
 ];

    case "ENDED":
      return [
        { label: "Ripromuovi", tone: "primary", disabled: true },
        { label: "Vedi statistiche", tone: "secondary", disabled: true },
      ];

    case "REJECTED":
      return [
        { label: "Vedi motivo", tone: "secondary", disabled: true },
        { label: "Modifica e reinvia", tone: "primary", disabled: true },
      ];

    case "CANCELLED":
      return [
        {
          label: "Richiesta annullata",
          tone: "secondary",
          disabled: true,
          title: "Questa richiesta è stata ritirata e non può più avanzare nel ciclo commerciale.",
        },
      ];

    case "INVALIDATED_BY_EVENT_CHANGE":
      return [
        {
          label: "Rivaluta promozione",
          tone: "primary",
          disabled: false,
          action: "open-revalidate",
          title: "Aggiorna la promozione e inviala di nuovo in revisione.",
        },
      ];

    default:
      return [{ label: "Visualizza dettagli", tone: "secondary", disabled: true }];
  }
}

function actionClass(action) {
  if (action.tone === "primary") return "org-promo-detail-action org-promo-detail-action--primary";
  if (action.tone === "danger") return "org-promo-detail-action org-promo-detail-action--danger";
  return "org-promo-detail-action";
}

export function renderPromoHero(root, promo) {
  if (!root) return;

  const status = statusInfo(promo.status);

  root.innerHTML = `
    <div class="org-promo-detail-hero__media">
      <img src="${getImage(promo)}" alt="${promo.title || "Promozione"}" />
    </div>

    <div class="org-promo-detail-hero__body">
      <div class="org-promo-detail-hero__top">
        <h1>${promo.title || "Promozione senza titolo"}</h1>

        <span class="org-promo-detail-badge org-promo-detail-badge--${status.tone}">
          ${status.label}
        </span>
      </div>

      <div class="org-promo-detail-meta">
        <span>📣 ${placementLabel(promo.placement)}</span>
        <span>📍 ${geoLabel(promo)}</span>
        <span>📅 ${periodLabel(promo)}</span>
      </div>

      <div class="org-promo-detail-meta">
        <span>ID promo: ${getId(promo) || "—"}</span>
        <span>Pagamento: ${paymentLabel(promo.paymentStatus)}</span>
      </div>
    </div>
  `;
}

export function renderTimeline(root, promo) {
  if (!root) return;

  const steps = timelineForStatus(promo.status);

  root.innerHTML = `
    <h2>Stato e avanzamento</h2>

    <div class="org-promo-detail-timeline">
      ${steps
        .map(
          (step) => `
          <div class="org-promo-detail-step org-promo-detail-step--${step.state}">
            <span class="org-promo-detail-step__dot"></span>
            <div>
              <strong>${step.title}</strong>
              <span>${step.text}</span>
            </div>
          </div>
        `
        )
        .join("")}
    </div>
  `;
}

export function renderCommercial(root, promo) {
  if (!root) return;

  const commercial = getCommercial(promo);

  root.innerHTML = `
    <h2>Riepilogo commerciale</h2>

    ${
      commercial.available
        ? `
          <div class="org-promo-detail-rows">
            <div class="org-promo-detail-row">
              <span>Imponibile</span>
              <strong>${euro(commercial.net)}</strong>
            </div>

            <div class="org-promo-detail-row">
              <span>IVA 22%</span>
              <strong>${euro(commercial.vat)}</strong>
            </div>

            <div class="org-promo-detail-row">
              <span>Totale IVA inclusa</span>
              <strong>${euro(commercial.gross)}</strong>
            </div>

            <div class="org-promo-detail-row">
              <span>Pagamento</span>
              <strong>${paymentLabel(promo.paymentStatus)}</strong>
            </div>

            <div class="org-promo-detail-row">
              <span>Pagato il</span>
              <strong>${dateTimeLabel(promo.paidAt)}</strong>
            </div>
          </div>
        `
        : `
          <p>Preventivo non disponibile per questa promozione.</p>
        `
    }
  `;
}

export function renderPerformance(root, promo) {
  if (!root) return;

  const impressions = Number(promo.impressionsTotal || 0);
  const clicks = Number(promo.clicksTotal || 0);

  root.innerHTML = `
    <h2>Performance</h2>

    ${
      impressions || clicks
        ? `
          <div class="org-promo-detail-rows">
            <div class="org-promo-detail-row">
              <span>Visualizzazioni</span>
              <strong>${impressions}</strong>
            </div>

            <div class="org-promo-detail-row">
              <span>Click</span>
              <strong>${clicks}</strong>
            </div>

            <div class="org-promo-detail-row">
              <span>CTR</span>
              <strong>${getCtr(promo)}%</strong>
            </div>
          </div>
        `
        : `
          <p>Non ci sono ancora statistiche disponibili.</p>
        `
    }
  `;
}

function getEventTitle(event = {}) {
  return event.title || event.nome || "Evento senza titolo";
}

function getEventPlace(event = {}) {
  return [event.city || event.citta, event.region]
    .filter(Boolean)
    .join(" · ") || "Luogo non disponibile";
}

function getEventDate(event = {}) {
  return dateTimeLabel(
    event.dateStart ||
    event.dataStart ||
    event.startDate ||
    event.startAt
  );
}

function getEventImage(event = {}) {
  return (
    event.coverImage ||
    event.imageUrl ||
    event.image ||
    "https://placehold.co/600x300?text=Evento"
  );
}

export function renderEvent(root, promo, linkedEvent = null) {
  if (!root) return;

  if (!promo.eventId) {
    root.innerHTML = `
      <h2>Evento collegato</h2>
      <p>Evento non disponibile.</p>
    `;
    return;
  }

  if (!linkedEvent) {
    root.innerHTML = `
      <h2>Evento collegato</h2>

      <div class="org-promo-detail-rows">
        <div class="org-promo-detail-row">
          <span>ID evento</span>
          <strong>${promo.eventId}</strong>
        </div>
      </div>

      <p style="margin-top: 10px;">
        Dettagli evento non disponibili al momento.
      </p>
    `;
    return;
  }

  root.innerHTML = `
    <h2>Evento collegato</h2>

    <article class="org-promo-detail-event-card">
      <img
        src="${getEventImage(linkedEvent)}"
        alt="${getEventTitle(linkedEvent)}"
        loading="lazy"
      />

      <div>
        <strong>${getEventTitle(linkedEvent)}</strong>
        <span>${getEventPlace(linkedEvent)}</span>
        <span>${getEventDate(linkedEvent)}</span>
      </div>
    </article>

    <div class="org-promo-detail-actions org-promo-detail-event-actions">
      <a
        class="org-promo-detail-action"
        href="/pages/organizer-event-detail-v2.html?id=${encodeURIComponent(promo.eventId)}"
      >
        Apri evento
      </a>
    </div>
  `;
}

export function renderNotes(root, promo) {
  if (!root) return;

  root.innerHTML = `
    <h2>Note e revisione</h2>

    <p>${promo.notes || "Nessuna nota inserita."}</p>

    <p style="margin-top: 10px;">
      Le note admin, il motivo di rifiuto e la cronologia di revisione saranno
      disponibili quando il backend commerciale sarà esteso.
    </p>
  `;
}

export function renderActions(root, promo) {
  if (!root) return;

  const actions = actionsForStatus(promo.status);

  root.innerHTML = `
    <h2>Azioni</h2>

    <div class="org-promo-detail-actions">
      ${actions
        .map(
          (action) => `
          <button
            type="button"
            class="${actionClass(action)}"
            ${action.disabled ? `disabled title="${action.title || "Funzione in arrivo"}"` : ""}
            ${action.action ? `data-promo-detail-action="${action.action}"` : ""}
          >
            ${action.label}
          </button>
        `
        )
        .join("")}
    </div>

    <p style="margin-top: 10px;">
      Le azioni commerciali avanzate saranno abilitate progressivamente con i prossimi endpoint dedicati.
      Il checkout reale non è ancora collegato: in questa fase il passaggio a pagata resta disponibile solo come controllo admin/test.
    </p>
  `;
    }
