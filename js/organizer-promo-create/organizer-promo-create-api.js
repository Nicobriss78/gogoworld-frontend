// js/organizer-promo-create/organizer-promo-create-api.js
// API Organizer Promo Create V2

import { apiGet, apiPost } from "../api.js";

export async function fetchOrganizerEvents() {
  const response = await apiGet("/events/mine/list");

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.events)) {
    return response.events;
  }

  return [];
}

export async function estimatePromo(payload) {
  return apiPost("/banners/estimate", payload);
}

export async function analyzePromo(payload) {
  return apiPost("/banners/analyze", payload);
}

export async function submitPromo(payload) {
  return apiPost("/banners/submit", payload);
}
