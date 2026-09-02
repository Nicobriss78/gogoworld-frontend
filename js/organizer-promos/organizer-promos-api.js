// js/organizer-promos/organizer-promos-api.js
// API Promozioni Organizer V2

import { apiGet, apiPost } from "../api.js";
export async function fetchOrganizerPromos(params = {}) {
  const query = new URLSearchParams();

  if (params.status && params.status !== "ALL") {
    query.set("status", params.status);
  }

  if (params.placement && params.placement !== "ALL") {
    query.set("placement", params.placement);
  }

  const qs = query.toString();
  const endpoint = qs ? `/banners/mine?${qs}` : "/banners/mine";

  return apiGet(endpoint);
}

export async function fetchOrganizerPromoEvents() {
  const response = await apiGet("/events/mine/list");

  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.events)) return response.events;
  if (Array.isArray(response?.data)) return response.data;

  return [];
}

export async function withdrawOrganizerPromo(id, reason = "") {
  if (!id) {
    throw new Error("Promo id mancante");
  }

  return apiPost(`/banners/mine/${encodeURIComponent(id)}/withdraw`, {
    reason,
  });
}
