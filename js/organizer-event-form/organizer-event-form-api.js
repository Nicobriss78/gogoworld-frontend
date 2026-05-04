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
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Event form API error: ${path} (${res.status}) ${text}`);
  }

  return res.json();
}

export async function fetchEventById(eventId) {
  return fetchJson(`/events/${eventId}`);
}

export async function createOrganizerEvent(payload) {
  return fetchJson("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrganizerEvent(eventId, payload) {
  return fetchJson(`/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
