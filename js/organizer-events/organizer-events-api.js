const API_BASE = window.API_BASE || "https://gogoworld-api.onrender.com/api";

function getToken() {
  return localStorage.getItem("token");
}

async function fetchJson(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Organizer events API error: ${path} (${res.status})`);
  }

  return res.json();
}

export async function fetchOrganizerEvents() {
  const payload = await fetchJson("/events/mine/list");
  return Array.isArray(payload?.events) ? payload.events : [];
}

export async function deleteOrganizerEvent(eventId) {
  if (!eventId) {
    throw new Error("Missing eventId");
  }

  return fetchJson(`/events/${eventId}`, {
    method: "DELETE",
  });
}
