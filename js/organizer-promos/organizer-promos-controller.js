// js/organizer-promos/organizer-promos-controller.js
// Controller Promozioni Organizer V2

import {
  fetchOrganizerPromos,
  withdrawOrganizerPromo,
} from "./organizer-promos-api.js";import { renderPromos } from "./organizer-promos-renderer.js";

const state = {
  promos: [],
  filters: {
    status: "ALL",
    placement: "ALL",
    search: "",
  },
};

function qs(selector) {
  return document.querySelector(selector);
}

function setHidden(el, hidden) {
  if (!el) return;
  el.hidden = !!hidden;
}

function getPromoStatusGroup(status) {
  return status || "UNKNOWN";
}

function matchesFilters(promo) {
  const statusFilter = state.filters.status;
  const placementFilter = state.filters.placement;
  const search = state.filters.search.trim().toLowerCase();

  if (statusFilter !== "ALL") {
    const promoStatus = getPromoStatusGroup(promo.status);
    const wantedStatus = getPromoStatusGroup(statusFilter);

    if (promoStatus !== wantedStatus) {
      return false;
    }
  }

  if (placementFilter !== "ALL" && promo.placement !== placementFilter) {
    return false;
  }

  if (search) {
    const haystack = [
      promo.title,
      promo.eventId,
      promo.status,
      promo.placement,
      promo.region,
      promo.country,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(search)) {
      return false;
    }
  }

  return true;
}

function computeKpis(promos = []) {
  return promos.reduce(
    (acc, promo) => {
      const status = getPromoStatusGroup(promo.status);

      if (status === "PENDING_REVIEW") acc.review += 1;
      if (status === "PENDING_PAYMENT") acc.payment += 1;
      if (status === "ACTIVE") acc.active += 1;
      if (status === "ENDED") acc.ended += 1;

      return acc;
    },
    {
      review: 0,
      payment: 0,
      active: 0,
      ended: 0,
    }
  );
}

function renderKpis() {
  const kpis = computeKpis(state.promos);

  const review = qs("[data-org-promos-kpi='review']");
  const payment = qs("[data-org-promos-kpi='payment']");
  const active = qs("[data-org-promos-kpi='active']");
  const ended = qs("[data-org-promos-kpi='ended']");

  if (review) review.textContent = String(kpis.review);
  if (payment) payment.textContent = String(kpis.payment);
  if (active) active.textContent = String(kpis.active);
  if (ended) ended.textContent = String(kpis.ended);
}

function renderSmartBanner(promos = []) {
  const banner = qs("[data-org-promos-smart-banner]");
  const title = qs("[data-org-promos-smart-title]");
  const text = qs("[data-org-promos-smart-text]");
  const cta = qs("[data-org-promos-smart-cta]");

  if (!banner || !title || !text || !cta) return;

  const hasAny = promos.length > 0;
  const hasPayment = promos.some(
  (promo) => promo.status === "PENDING_PAYMENT"
);
  const hasActive = promos.some((promo) => promo.status === "ACTIVE");

  if (!hasAny) {
    title.textContent = "Promuovi il tuo primo evento";
    text.textContent =
      "Crea una promozione per aumentare la visibilità dei tuoi eventi.";
    cta.textContent = "Crea promozione";
    cta.href = "/pages/organizer-promo-create-v2.html";
    setHidden(banner, false);
    return;
  }

  if (hasPayment) {
    title.textContent = "Hai promozioni in attesa di pagamento";
    text.textContent =
      "Completa il pagamento delle promozioni approvate per avviarne la pubblicazione.";
    cta.textContent = "Vai alle promo";
    cta.href = "#";
    setHidden(banner, false);
    return;
  }

  if (!hasActive) {
    title.textContent = "Nessuna promozione attiva al momento";
    text.textContent =
      "Puoi creare una nuova promozione o attendere l’esito delle richieste in revisione.";
    cta.textContent = "Crea promozione";
    cta.href = "/pages/organizer-promo-create-v2.html";
    setHidden(banner, false);
    return;
  }

  setHidden(banner, true);
}

function render() {
  const list = qs("[data-org-promos-list]");
  const empty = qs("[data-org-promos-empty]");

  const filtered = state.promos.filter(matchesFilters);

  renderKpis();
  renderSmartBanner(state.promos);

  if (!filtered.length) {
    if (list) list.innerHTML = "";
    setHidden(empty, false);
    return;
  }

  setHidden(empty, true);
  renderPromos(list, filtered);
}

function setLoading(isLoading) {
  setHidden(qs("[data-org-promos-loading]"), !isLoading);
}

function setError(isError) {
  setHidden(qs("[data-org-promos-error]"), !isError);
}

function normalizeApiResponse(response) {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
}

async function loadPromos() {
  setError(false);
  setLoading(true);
  setHidden(qs("[data-org-promos-empty]"), true);

  try {
    const response = await fetchOrganizerPromos({
      status: state.filters.status,
      placement: state.filters.placement,
    });

    state.promos = normalizeApiResponse(response);
    render();
  } catch (err) {
    console.error("[OrganizerPromos] load error:", err);
    setError(true);
  } finally {
    setLoading(false);
  }
}

function bindFilters() {
  const search = qs("[data-org-promos-search]");
  const status = qs("[data-org-promos-status-filter]");
  const placement = qs("[data-org-promos-placement-filter]");

  if (search) {
    search.addEventListener("input", () => {
      state.filters.search = search.value || "";
      render();
    });
  }

  if (status) {
    status.addEventListener("change", () => {
      state.filters.status = status.value || "ALL";
      loadPromos();
    });
  }

  if (placement) {
    placement.addEventListener("change", () => {
      state.filters.placement = placement.value || "ALL";
      loadPromos();
    });
  }
}

function bindKpis() {
  document
    .querySelectorAll("[data-org-promos-filter-status]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const status = button.dataset.orgPromosFilterStatus || "ALL";
        const select = qs("[data-org-promos-status-filter]");

        state.filters.status = status;

        if (select) {
          select.value = state.filters.status;
        }

        loadPromos();
      });
    });
}

function bindRetry() {
  const retry = qs("[data-org-promos-retry]");
  if (!retry) return;

  retry.addEventListener("click", () => {
    loadPromos();
  });
}
function bindWithdrawActions() {
  const list = qs("[data-org-promos-list]");
  if (!list) return;

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-org-promos-withdraw]");
    if (!button) return;

    const promoId = button.dataset.promoId || "";
    const promoTitle = button.dataset.promoTitle || "questa promozione";

    if (!promoId) return;

    const confirmed = window.confirm(
      `Vuoi annullare la richiesta "${promoTitle}"?\n\nQuesta azione è possibile solo finché la promozione è in revisione.`
    );

    if (!confirmed) return;

    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = "Annullamento...";

      await withdrawOrganizerPromo(promoId);

      await loadPromos();
    } catch (err) {
      console.error("[OrganizerPromos] withdraw error:", err);
      window.alert(
        "Non è stato possibile annullare la richiesta. Verifica che sia ancora in revisione."
      );

      button.disabled = false;
      button.textContent = originalText;
    }
  });
}
function initOrganizerPromos() {
  const root = qs("[data-org-promos-root]");
  if (!root) return;

  bindFilters();
  bindKpis();
  bindRetry();
  loadPromos();
}

document.addEventListener("DOMContentLoaded", initOrganizerPromos);
