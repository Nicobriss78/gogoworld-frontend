// js/organizer-promo-create/organizer-promo-create-controller.js
// Controller Organizer Promo Create V2

import {
  fetchOrganizerEvents,
  analyzePromo,
  submitPromo,
} from "./organizer-promo-create-api.js";

import {
  renderEventsOptions,
  renderEventPreview,
  renderPromoPreview,
  renderEstimate,
  renderAvailability,
  showMessage,
} from "./organizer-promo-create-renderer.js";

const state = {
  events: [],
  selectedEvent: null,
  estimateTimer: null,
  latestEstimate: null,
};

function qs(selector) {
  return document.querySelector(selector);
}

function field(name) {
  return qs(`[data-promo-field="${name}"]`);
}

function getEventId(event) {
  return event?._id || event?.id || "";
}

function getEventTitle(event) {
  return event?.title || event?.nome || "Evento senza titolo";
}

function getEventImage(event) {
  return (
    event?.imageUrl ||
    event?.coverImage ||
    event?.image ||
    "https://placehold.co/600x300?text=Evento"
  );
}
function getEventCountry(event) {
return (
event?.country ||
event?.countryCode ||
event?.location?.country ||
"IT"
);
}

function getEventRegion(event) {
return (
event?.region ||
event?.location?.region ||
event?.address?.region ||
""
);
}

function getEventStartDate(event) {
return (
event?.dateStart ||
event?.dataStart ||
event?.startDate ||
event?.startAt ||
event?.startsAt ||
null
);
}

function getEventEndDate(event) {
return (
event?.dateEnd ||
event?.dataEnd ||
event?.endDate ||
event?.endAt ||
event?.endsAt ||
null
);
}

function isPromotableEvent(event) {
const now = new Date();

const end = getEventEndDate(event);
if (end) {
const endDate = new Date(end);
return !Number.isNaN(endDate.getTime()) && endDate >= now;
}

const start = getEventStartDate(event);
if (start) {
const startDate = new Date(start);
return !Number.isNaN(startDate.getTime()) && startDate >= now;
}

return true;
}
function getEventTargetUrl(event) {
const id = getEventId(event);
if (!id) return "";

return new URL(
`/pages/evento-v2.html?id=${encodeURIComponent(id)}`,
window.location.origin
).href;
}

function normalizeDateInput(value) {
  if (!value) return null;

  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function compareDateDays(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}

function getPayload() {
  const selected = state.selectedEvent;

  return {
    eventId: selected ? getEventId(selected) : "",

    title: field("title")?.value?.trim() || "",
    imageUrl: field("imageUrl")?.value?.trim() || "",
    targetUrl: selected ? getEventTargetUrl(selected) : "",

    placement: field("placement")?.value || "events_list_inline",
    geoScope: field("geoScope")?.value || "REGION",
    country: field("country")?.value?.trim() || "",
    region: field("region")?.value?.trim() || "",

    activeFrom: toIsoFromDatetimeLocal(field("activeFrom")?.value),
    activeTo: toIsoFromDatetimeLocal(field("activeTo")?.value),

    notes: field("notes")?.value?.trim() || "",
  };
}

function hasMinimumEstimatePayload(payload) {
  if (!payload.placement || !payload.geoScope || !payload.activeFrom || !payload.activeTo) {
    return false;
  }

  if (payload.geoScope === "COUNTRY" && !payload.country) {
    return false;
  }

  if (payload.geoScope === "REGION" && (!payload.country || !payload.region)) {
    return false;
  }

  return true;
}
function setSubmitBlocked(blocked) {
const submitBtn = qs("[data-promo-submit]");
if (!submitBtn) return;

submitBtn.disabled = !!blocked;
submitBtn.dataset.availabilityBlocked = blocked ? "true" : "false";
}

function hasInvalidDateRange(payload) {
if (!payload?.activeFrom || !payload?.activeTo) {
return false;
}

return new Date(payload.activeTo) <= new Date(payload.activeFrom);
}
function updateGeoFields() {
  const geoScope = field("geoScope")?.value || "REGION";
  const countryWrap = qs("[data-country-field]");
  const regionWrap = qs("[data-region-field]");

  if (countryWrap) {
    countryWrap.hidden = geoScope === "GLOBAL";
  }

  if (regionWrap) {
    regionWrap.hidden = geoScope !== "REGION";
  }
}

function syncEventSelection() {
  const select = field("eventId");
  const id = select?.value || "";

  state.selectedEvent =
    state.events.find((event) => getEventId(event) === id) || null;

  const title = field("title");
  const imageUrl = field("imageUrl");

  if (state.selectedEvent) {
if (title && !title.value) {
title.value = getEventTitle(state.selectedEvent);
}

if (imageUrl && !imageUrl.value) {
imageUrl.value = getEventImage(state.selectedEvent);
}

const country = field("country");
const region = field("region");

if (country && !country.value) {
country.value = getEventCountry(state.selectedEvent);
}

if (region && !region.value) {
region.value = getEventRegion(state.selectedEvent);
}
}

  renderEventPreview(
    {
      box: qs("[data-promo-event-preview]"),
      image: qs("[data-promo-event-image]"),
      title: qs("[data-promo-event-title]"),
      meta: qs("[data-promo-event-meta]"),
    },
    state.selectedEvent
  );

  renderLive();
}

function renderLive() {
  const payload = getPayload();

  renderPromoPreview(
    {
      image: qs("[data-promo-preview-image]"),
      title: qs("[data-promo-preview-title]"),
      meta: qs("[data-promo-preview-meta]"),
    },
    payload
  );
  if (hasInvalidDateRange(payload)) {
renderEstimate(
{
net: qs("[data-price-net]"),
vat: qs("[data-price-vat]"),
gross: qs("[data-price-gross]"),
},
null
);

renderAvailability(qs("[data-promo-availability]"), {
status: "INVALID_DATE_RANGE",
});

setSubmitBlocked(true);
return;
}
  if (!hasMinimumEstimatePayload(payload)) {
    renderEstimate(
      {
        net: qs("[data-price-net]"),
        vat: qs("[data-price-vat]"),
        gross: qs("[data-price-gross]"),
      },
      null
    );

    renderAvailability(qs("[data-promo-availability]"), {
      status: "UNKNOWN",
    });
 setSubmitBlocked(false);
    return;
  }

  scheduleEstimate(payload);
}

function scheduleEstimate(payload) {
if (state.estimateTimer) {
clearTimeout(state.estimateTimer);
}

const start = payload?.activeFrom;
const end = payload?.activeTo;

if (!start || !end) {
return;
}

if (new Date(end) <= new Date(start)) {
return;
}

state.estimateTimer = setTimeout(() => {
runEstimate(payload);
}, 350);
}

async function runEstimate(payload) {
  try {
    const response = await analyzePromo(payload);
    if (response?.ok === false) {
const errorCode =
response?.data?.error ||
response?.data?.code ||
response?.error ||
"";

const validationErrors =
response?.data?.data?.validationErrors ||
response?.data?.validationErrors ||
[];

renderEstimate(
{
net: qs("[data-price-net]"),
vat: qs("[data-price-vat]"),
gross: qs("[data-price-gross]"),
},
null
);

if (
errorCode === "PROMO_AFTER_EVENT_END" ||
validationErrors.includes("PROMO_AFTER_EVENT_END")
) {
renderAvailability(qs("[data-promo-availability]"), {
status: "PROMO_AFTER_EVENT_END",
});
setSubmitBlocked(true);
return;
}

renderAvailability(qs("[data-promo-availability]"), {
status: "UNKNOWN",
});

setSubmitBlocked(false);
return;
}
    const analyze = response?.data || response;
const estimate = analyze?.pricing || analyze;
const availability = analyze?.availability || null;

    state.latestEstimate = estimate;

    renderEstimate(
      {
        net: qs("[data-price-net]"),
        vat: qs("[data-price-vat]"),
        gross: qs("[data-price-gross]"),
      },
      estimate
    );

    renderAvailability(qs("[data-promo-availability]"), availability);
    setSubmitBlocked(availability?.available === false);
  } catch (err) {
console.warn("[OrganizerPromoCreate] estimate failed:", err);

renderEstimate(
{
net: qs("[data-price-net]"),
vat: qs("[data-price-vat]"),
gross: qs("[data-price-gross]"),
},
null
);

const responseData =
err?.data ||
err?.response?.data ||
err?.payload ||
{};

const errorCode =
responseData?.error ||
responseData?.code ||
err?.error ||
err?.code ||
"";

const validationErrors =
responseData?.validationErrors || [];

if (
errorCode === "PROMO_AFTER_EVENT_END" ||
validationErrors.includes("PROMO_AFTER_EVENT_END")
) {
renderAvailability(qs("[data-promo-availability]"), {
status: "PROMO_AFTER_EVENT_END",
});

setSubmitBlocked(true);
return;
}

renderAvailability(qs("[data-promo-availability]"), {
status: "UNKNOWN",
});

setSubmitBlocked(false);
}
}

function validateSubmit(payload) {
  if (!payload.eventId) return "Seleziona un evento da promuovere.";
  if (!payload.title) return "Inserisci il titolo della promozione.";
  if (!payload.imageUrl) return "Inserisci l’immagine della promozione.";
  if (!payload.targetUrl) return "Target evento non disponibile.";
  if (!payload.placement) return "Seleziona il placement.";
  if (!payload.geoScope) return "Seleziona la copertura.";
  if (payload.geoScope !== "GLOBAL" && !payload.country) return "Inserisci il paese.";
  if (payload.geoScope === "REGION" && !payload.region) return "Inserisci la regione.";
  if (!payload.activeFrom) return "Inserisci la data di inizio.";
  if (!payload.activeTo) return "Inserisci la data di fine.";

  if (new Date(payload.activeTo) <= new Date(payload.activeFrom)) {
    return "La data di fine deve essere successiva alla data di inizio.";
  }

  return "";
}

async function handleSubmit(event) {
  event.preventDefault();

  const errorBox = qs("[data-promo-error]");
  const successBox = qs("[data-promo-success]");
  const submitBtn = qs("[data-promo-submit]");

  showMessage(errorBox, "");
  showMessage(successBox, "");

  const payload = getPayload();
  const error = validateSubmit(payload);

  if (error) {
    showMessage(errorBox, error);
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Invio in corso…";
  }

  try {
    const response = await submitPromo(payload);

if (!response?.ok) {
throw new Error(response?.message || response?.error || "Submit promo failed");
}

const data = response?.data || response;

showMessage(
successBox,
"Richiesta promozione inviata. Sarà verificata prima della richiesta di pagamento."
);

    setTimeout(() => {
      window.location.href = "/pages/organizer-promos-v2.html";
    }, 900);

    console.info("[OrganizerPromoCreate] created promo:", data);
  } catch (err) {
    console.error("[OrganizerPromoCreate] submit failed:", err);
    showMessage(
      errorBox,
      err?.message || "Impossibile inviare la richiesta promozione."
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Invia richiesta promozione";
    }
  }
}

async function loadEvents() {
  const select = field("eventId");
  const errorBox = qs("[data-promo-error]");

  try {
    const events = await fetchOrganizerEvents();
state.events = events.filter(isPromotableEvent);
renderEventsOptions(select, state.events);
  } catch (err) {
    console.error("[OrganizerPromoCreate] events load failed:", err);
    showMessage(
      errorBox,
      "Impossibile caricare i tuoi eventi. Riprova più tardi."
    );
  }
}

function bindFields() {
  const form = qs("[data-org-promo-create-form]");

  document
    .querySelectorAll("[data-promo-field]")
    .forEach((el) => {
      el.addEventListener("input", () => {
        if (el.dataset.promoField === "geoScope") {
          updateGeoFields();
        }

        renderLive();
      });

      el.addEventListener("change", () => {
        if (el.dataset.promoField === "eventId") {
          syncEventSelection();
          return;
        }

        if (el.dataset.promoField === "geoScope") {
          updateGeoFields();
        }

        renderLive();
      });
    });

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
}

async function init() {
  const root = qs("[data-org-promo-create-root]");
  if (!root) return;

  updateGeoFields();
  bindFields();
  renderLive();
  await loadEvents();
}

document.addEventListener("DOMContentLoaded", init);
