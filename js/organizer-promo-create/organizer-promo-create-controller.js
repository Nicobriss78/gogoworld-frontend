// js/organizer-promo-create/organizer-promo-create-controller.js
// Controller Organizer Promo Create V2

import {
  fetchOrganizerEvents,
  analyzePromo,
  submitPromo,
  fetchOrganizerPromoById,
  revalidatePromo,
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
  isSubmitting: false,
  mode: "create",
  revalidatePromoId: "",
  revalidatePromo: null,
  isHydratingRevalidate: false,
};

function qs(selector) {
  return document.querySelector(selector);
}

function field(name) {
  return qs(`[data-promo-field="${name}"]`);
}
function getRouteParams() {
  return new URLSearchParams(window.location.search);
}

function getDateInputValue(value, { exclusiveEnd = false } = {}) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  if (exclusiveEnd) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return date.toISOString().slice(0, 10);
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
  const fallbackCountry = selected ? getEventCountry(selected) : "";
  const fallbackRegion = selected ? getEventRegion(selected) : "";

  const geoScopeValue = field("geoScope")?.value || "REGION";
  const countryValue =
    field("country")?.value?.trim() ||
    fallbackCountry ||
    state.revalidatePromo?.country ||
    "";

  const regionValue =
    field("region")?.value?.trim() ||
    fallbackRegion ||
    state.revalidatePromo?.region ||
    "";
  return {
    eventId: selected ? getEventId(selected) : "",

    title: field("title")?.value?.trim() || "",
    imageUrl: field("imageUrl")?.value?.trim() || "",
    targetUrl: selected ? getEventTargetUrl(selected) : "",

    placement: field("placement")?.value || "events_list_inline",
    geoScope: geoScopeValue,
    country: countryValue,
    region: regionValue,

    activeFrom: normalizeDateInput(field("activeFrom")?.value),
    activeTo: normalizeDateInput(field("activeTo")?.value),

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
function getGeoValidationStatus(payload) {
  if (!payload?.geoScope) return "INVALID_GEO_CONFIGURATION";

  if (payload.geoScope === "COUNTRY" && !payload.country) {
    return "INVALID_GEO_CONFIGURATION";
  }

  if (payload.geoScope === "REGION" && (!payload.country || !payload.region)) {
    return "INVALID_GEO_CONFIGURATION";
  }

  return "";
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

return compareDateDays(payload.activeTo, payload.activeFrom) < 0;}
function clearEstimateTimer() {
  if (state.estimateTimer) {
    clearTimeout(state.estimateTimer);
    state.estimateTimer = null;
  }
}

function getSelectedEventEndDay() {
  const end = state.selectedEvent ? getEventEndDate(state.selectedEvent) : null;
  if (!end) return "";

  const date = new Date(end);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function hasPromoAfterEventEnd(payload) {
  const eventEndDay = getSelectedEventEndDay();
  if (!eventEndDay || !payload?.activeTo) return false;

  return compareDateDays(payload.activeTo, eventEndDay) > 0;
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
function applyRevalidateModeUI() {
  const eyebrow = qs(".org-promo-create-eyebrow");
  const headerText = qs(".org-promo-create-header p:not(.org-promo-create-eyebrow)");
  const submitBtn = qs("[data-promo-submit]");
  const eventSelect = field("eventId");

  if (state.mode !== "revalidate") return;

  if (eyebrow) {
    eyebrow.textContent = "Rivaluta promozione";
  }

  if (headerText) {
    headerText.textContent =
      "Le date dell’evento collegato sono cambiate. Aggiorna la promozione e inviala di nuovo in revisione.";
  }

  if (submitBtn) {
    submitBtn.textContent = "Invia richiesta di rivalutazione";
  }

  if (eventSelect) {
    eventSelect.disabled = true;
  }
}

function fillRevalidateForm(promo) {
  if (!promo) return;

  const eventId = typeof promo.eventId === "object"
    ? promo.eventId?._id || promo.eventId?.id || ""
    : promo.eventId || "";

  const eventSelect = field("eventId");
  if (eventSelect) eventSelect.value = eventId;

  const title = field("title");
  if (title) title.value = promo.title || "";

  const imageUrl = field("imageUrl");
  if (imageUrl) imageUrl.value = promo.imageUrl || "";

  const placement = field("placement");
  if (placement) placement.value = promo.placement || "events_list_inline";

  const geoScope = field("geoScope");
  if (geoScope) geoScope.value = promo.geoScope || "REGION";

  const country = field("country");
  if (country) country.value = promo.country || "IT";

  const region = field("region");
  if (region) region.value = promo.region || "";

  const activeFrom = field("activeFrom");
  if (activeFrom) activeFrom.value = getDateInputValue(promo.activeFrom);

  const activeTo = field("activeTo");
  if (activeTo) activeTo.value = getDateInputValue(promo.activeTo, { exclusiveEnd: true });

  const notes = field("notes");
  if (notes) notes.value = promo.notes || "";

state.isHydratingRevalidate = true;

syncEventSelection();
updateGeoFields();
applyRevalidateModeUI();

state.isHydratingRevalidate = false;
state.latestEstimate = null;

renderLive();
}
function renderLive() {
  if (state.isHydratingRevalidate) return;
  const payload = getPayload();

  renderPromoPreview(
    {
      image: qs("[data-promo-preview-image]"),
      title: qs("[data-promo-preview-title]"),
      meta: qs("[data-promo-preview-meta]"),
    },
    payload
  );
  const geoValidationStatus = getGeoValidationStatus(payload);

if (geoValidationStatus) {
  clearEstimateTimer();
  renderEstimate(
    {
      net: qs("[data-price-net]"),
      vat: qs("[data-price-vat]"),
      gross: qs("[data-price-gross]"),
    },
    null
  );

  renderAvailability(qs("[data-promo-availability]"), {
    status: geoValidationStatus,
  });

  setSubmitBlocked(true);
  return;
}
  if (hasInvalidDateRange(payload)) {
    clearEstimateTimer();
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

if (compareDateDays(end, start) < 0) {
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
response?.data?.data?.availability?.validationErrors ||
response?.data?.availability?.validationErrors ||
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
errorCode === "EVENT_ALREADY_STARTED" ||
validationErrors.includes("EVENT_ALREADY_STARTED")
) {
renderAvailability(qs("[data-promo-availability]"), {
status: "EVENT_ALREADY_STARTED",
});
setSubmitBlocked(true);
return;
}
if (
errorCode === "PROMO_DURATION_EXCEEDED" ||
validationErrors.includes("PROMO_DURATION_EXCEEDED") ||
errorCode === "MAX_DURATION_EXCEEDED" ||
validationErrors.includes("MAX_DURATION_EXCEEDED")
) {
renderAvailability(qs("[data-promo-availability]"), {
status: "PROMO_DURATION_EXCEEDED",
});
setSubmitBlocked(true);
return;
}      
if (
errorCode === "BOOKING_WINDOW_EXCEEDED" ||
validationErrors.includes("BOOKING_WINDOW_EXCEEDED")
) {
  renderAvailability(qs("[data-promo-availability]"), {
    status: "BOOKING_WINDOW_EXCEEDED",
  });
  setSubmitBlocked(true);
  return;
}
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
responseData?.data?.validationErrors ||
responseData?.validationErrors ||
responseData?.data?.availability?.validationErrors ||
responseData?.availability?.validationErrors ||
[];
if (
errorCode === "EVENT_ALREADY_STARTED" ||
validationErrors.includes("EVENT_ALREADY_STARTED")
) {
renderAvailability(qs("[data-promo-availability]"), {
status: "EVENT_ALREADY_STARTED",
});

setSubmitBlocked(true);
return;
}
if (
errorCode === "PROMO_DURATION_EXCEEDED" ||
validationErrors.includes("PROMO_DURATION_EXCEEDED") ||
errorCode === "MAX_DURATION_EXCEEDED" ||
validationErrors.includes("MAX_DURATION_EXCEEDED")
) {
renderAvailability(qs("[data-promo-availability]"), {
status: "PROMO_DURATION_EXCEEDED",
});

setSubmitBlocked(true);
return;
}    
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

  if (compareDateDays(payload.activeTo, payload.activeFrom) < 0) {
  return "La data di fine non può essere precedente alla data di inizio.";
}

  return "";
}

async function handleSubmit(event) {
  event.preventDefault();
if (state.isSubmitting) {
  return;
}

state.isSubmitting = true;
  const errorBox = qs("[data-promo-error]");
  const successBox = qs("[data-promo-success]");
  const submitBtn = qs("[data-promo-submit]");

  showMessage(errorBox, "");
  showMessage(successBox, "");

  const payload = getPayload();
  const error = validateSubmit(payload);

  if (error) {
  state.isSubmitting = false;
  showMessage(errorBox, error);
  return;
}

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Invio in corso…";
  }

  try {
    const response =
      state.mode === "revalidate"
        ? await revalidatePromo(state.revalidatePromoId, payload)
        : await submitPromo(payload);

if (!response?.ok) {
throw new Error(response?.message || response?.error || "Submit promo failed");
}

const data = response?.data || response;

showMessage(
successBox,
state.mode === "revalidate"
  ? "Richiesta di rivalutazione inviata. Sarà verificata nuovamente."
  : "Richiesta promozione inviata. Sarà verificata prima della richiesta di pagamento."
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
    if (!successBox?.textContent) {
  state.isSubmitting = false;

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent =
  state.mode === "revalidate"
    ? "Invia richiesta di rivalutazione"
    : "Invia richiesta promozione";
  }
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

  const params = getRouteParams();
  state.mode = params.get("mode") === "revalidate" ? "revalidate" : "create";
  state.revalidatePromoId = state.mode === "revalidate" ? params.get("id") || "" : "";

  updateGeoFields();
  bindFields();
  renderLive();
  await loadEvents();

  if (state.mode === "revalidate") {
    const errorBox = qs("[data-promo-error]");

    if (!state.revalidatePromoId) {
      showMessage(errorBox, "Promozione da rivalutare non specificata.");
      return;
    }

    try {
      const promo = await fetchOrganizerPromoById(state.revalidatePromoId);

      if (promo?.status !== "INVALIDATED_BY_EVENT_CHANGE") {
        showMessage(errorBox, "Questa promozione non richiede rivalutazione.");
        return;
      }

      state.revalidatePromo = promo;
      fillRevalidateForm(promo);
    } catch (err) {
      console.error("[OrganizerPromoCreate] revalidate promo load failed:", err);
      showMessage(errorBox, "Impossibile caricare la promozione da rivalutare.");
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
