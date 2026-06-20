// js/organizer-promo-detail/organizer-promo-detail-controller.js
// Controller Organizer Promo Detail V2

import {
  fetchOrganizerPromoById,
  fetchLinkedEventById,
  withdrawOrganizerPromo,
  payTestOrganizerPromo,
} from "./organizer-promo-detail-api.js";
import {
  renderPromoHero,
  renderTimeline,
  renderCommercial,
  renderPerformance,
  renderEvent,
  renderNotes,
  renderActions,
} from "./organizer-promo-detail-renderer.js";

function qs(selector) {
  return document.querySelector(selector);
}
let currentPromo = null;
let currentLinkedEvent = null;
function getPromoId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}
function getPromoEventId(promo) {
  if (!promo?.eventId) return "";

  if (typeof promo.eventId === "string") {
    return promo.eventId;
  }

  return promo.eventId._id || promo.eventId.id || "";
}
function showLoading(show) {
  const loading = qs("[data-promo-detail-loading]");
  if (!loading) return;

  loading.hidden = !show;
}

function showError(show) {
  const error = qs("[data-promo-detail-error]");
  if (!error) return;

  error.hidden = !show;
}

function showContent(show) {
  const content = qs("[data-promo-detail-content]");
  if (!content) return;

  content.hidden = !show;
}

function renderPromo(promo, linkedEvent = null) {
  currentPromo = promo;
  currentLinkedEvent = linkedEvent;

  renderPromoHero(
    qs("[data-promo-detail-hero]"),
    promo
  );

  renderTimeline(
    qs("[data-promo-detail-timeline]"),
    promo
  );

  renderCommercial(
    qs("[data-promo-detail-commercial]"),
    promo
  );

  renderPerformance(
    qs("[data-promo-detail-performance]"),
    promo
  );

  renderEvent(
    qs("[data-promo-detail-event]"),
    promo,
    linkedEvent
  );

  renderNotes(
    qs("[data-promo-detail-notes]"),
    promo
  );

  renderActions(
    qs("[data-promo-detail-actions]"),
    promo
  );
}
function bindPromoActions() {
  const actionsRoot = qs("[data-promo-detail-actions]");
  if (!actionsRoot) return;

  actionsRoot.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-promo-detail-action]");
    if (!button) return;

    const action = button.dataset.promoDetailAction;
    if (!["withdraw", "pay-test", "open-revalidate"].includes(action)) return;
    const promoId = currentPromo?._id || currentPromo?.id || "";
    const promoTitle = currentPromo?.title || "questa promozione";

    if (!promoId) return;
    if (action === "open-revalidate") {
      window.location.href =
        `/pages/organizer-promo-create-v2.html?mode=revalidate&id=${encodeURIComponent(promoId)}`;
      return;
    }
    if (action === "pay-test") {
      if (button.dataset.confirmed !== "true") {
  button.dataset.confirmed = "true";
  button.textContent = "Conferma pagamento test";
  return;
}

      const originalText = button.textContent;

      try {
        button.disabled = true;
        button.textContent = "Pagamento test...";

        const response = await payTestOrganizerPromo(promoId);
        const updatedPromo =
          response?.data ||
          response?.promo ||
          response;

        renderPromo(updatedPromo, currentLinkedEvent);
      } catch (err) {
        console.error("[OrganizerPromoDetail] pay-test error:", err);
        window.alert(
          "Non è stato possibile completare il pagamento test. Verifica che la promozione sia in attesa di pagamento."
        );

        button.disabled = false;
        button.textContent = originalText;
      }

      return;
    }
    const confirmed = window.confirm(
      `Vuoi annullare la richiesta "${promoTitle}"?\n\nQuesta azione è possibile solo finché la promozione è in revisione.`
    );

    if (!confirmed) return;

    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = "Annullamento...";

      const response = await withdrawOrganizerPromo(promoId);
      const updatedPromo =
        response?.data ||
        response?.promo ||
        response;

      renderPromo(updatedPromo, currentLinkedEvent);
    } catch (err) {
      console.error("[OrganizerPromoDetail] withdraw error:", err);
      window.alert(
        "Non è stato possibile annullare la richiesta. Verifica che sia ancora in revisione."
      );

      button.disabled = false;
      button.textContent = originalText;
    }
  });
}
async function init() {
  const root = qs("[data-promo-detail-root]");
  if (!root) return;

  bindPromoActions();

  const promoId = getPromoId();

  if (!promoId) {
    showLoading(false);
    showContent(false);
    showError(true);
    return;
  }

  try {
    showLoading(true);
    showError(false);
    showContent(false);

    const promo = await fetchOrganizerPromoById(promoId);

let linkedEvent = null;
const linkedEventId = getPromoEventId(promo);

if (linkedEventId) {
  try {
    linkedEvent = await fetchLinkedEventById(linkedEventId);
  } catch (eventErr) {
    console.warn("[OrganizerPromoDetail] linked event load failed:", eventErr);
  }
}

renderPromo(
  {
    ...promo,
    eventId: linkedEventId || promo.eventId,
  },
  linkedEvent
);
    showLoading(false);
    showError(false);
    showContent(true);

    console.info(
      "[OrganizerPromoDetail] loaded promo:",
      promo
    );
  } catch (err) {
    console.error(
      "[OrganizerPromoDetail] load failed:",
      err
    );

    showLoading(false);
    showContent(false);
    showError(true);
  }
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
