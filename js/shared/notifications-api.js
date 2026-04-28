import { apiGet, apiPatch, apiPost } from "../api.js";

export async function getMyNotifications(options = {}) {
  const params = new URLSearchParams();

  if (options.limit) params.set("limit", String(options.limit));
  if (options.unreadOnly) params.set("unreadOnly", "1");

  const query = params.toString();
  return apiGet(`/notifications/mine${query ? `?${query}` : ""}`);
}

export async function markNotificationRead(id) {
  if (!id) return { ok: false, error: "MISSING_NOTIFICATION_ID" };
  return apiPatch(`/notifications/${encodeURIComponent(id)}/read`, {});
}

export async function markAllNotificationsRead() {
  return apiPost("/notifications/read-all", {});
}
