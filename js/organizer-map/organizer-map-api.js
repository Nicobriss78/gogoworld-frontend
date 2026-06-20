import { apiGet } from "/js/api.js";

export async function fetchOrganizerMapSummary() {
  const response = await apiGet("/organizer/events/map-summary");

  if (!response?.ok) {
    throw new Error(response?.message || response?.error || "MAP_SUMMARY_ERROR");
  }

  return response.data || {
    privacy: null,
    kpis: null,
    events: [],
  };
}
