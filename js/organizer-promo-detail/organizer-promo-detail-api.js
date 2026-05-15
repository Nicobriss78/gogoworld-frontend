// js/organizer-promo-detail/organizer-promo-detail-api.js
// API Organizer Promo Detail V2

import { apiGet } from "../api.js";

export async function fetchOrganizerPromoById(id) {
  if (!id) {
    throw new Error("Promo id mancante");
  }

  const response = await apiGet("/banners/mine");

  let promos = [];

  if (Array.isArray(response)) {
    promos = response;
  } else if (Array.isArray(response?.data)) {
    promos = response.data;
  } else if (Array.isArray(response?.data?.data)) {
    promos = response.data.data;
  }

  const promo = promos.find((item) => {
    const itemId = item?._id || item?.id;
    return String(itemId) === String(id);
  });

  if (!promo) {
    throw new Error("Promozione non trovata");
  }

  return promo;
}
