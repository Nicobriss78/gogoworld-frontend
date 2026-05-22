// js/organizer-promo-detail/organizer-promo-detail-api.js
// API Organizer Promo Detail V2

import { apiGet, apiPost } from "../api.js";
export async function fetchOrganizerPromoById(id) {
  if (!id) {
    throw new Error("Promo id mancante");
  }

  const response = await apiGet(`/banners/mine/${encodeURIComponent(id)}`);

  return response?.data || response?.promo || response || null;
}
export async function fetchLinkedEventById(eventId) {
  if (!eventId) return null;

  const response = await apiGet(`/events/${encodeURIComponent(eventId)}`);

  return response?.event || response?.data || response || null;
}
export async function withdrawOrganizerPromo(id, reason = "") {
  if (!id) {
    throw new Error("Promo id mancante");
  }

  return apiPost(`/banners/mine/${encodeURIComponent(id)}/withdraw`, {
    reason,
  });
}
export async function payTestOrganizerPromo(id) {
  if (!id) {
    throw new Error("Promo id mancante");
  }

  return apiPost(`/banners/mine/${encodeURIComponent(id)}/pay-test`, {
    mode: "test",
  });
}
