// js/organizer-promo-detail/organizer-promo-detail-controller.js
// Controller Organizer Promo Detail V2

import {
  fetchOrganizerPromoById,
  fetchLinkedEventById,
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

function getPromoId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
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

function renderPromo(promo, linkedEvent = null) {  renderPromoHero(
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

async function init() {
  const root = qs("[data-promo-detail-root]");
  if (!root) return;

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

    renderPromo(promo);

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
