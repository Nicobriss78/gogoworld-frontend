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
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Event detail API error: ${path} (${res.status})`);
  }

  return res.json();
}

export async function fetchEventById(eventId) {
  return fetchJson(`/events/${eventId}`);
}

export async function deleteOrganizerEvent(eventId) {
  return fetchJson(`/events/${eventId}`, {
    method: "DELETE",
  });
}

export async function openOrJoinEventRoom(eventId) {
  return fetchJson(`/rooms/event/${eventId}/open-or-join`, {
    method: "POST",
  });
}

export async function unlockEventRoom(eventId, accessCode) {
  return fetchJson(`/rooms/event/${eventId}/unlock`, {
    method: "POST",
    body: JSON.stringify({ accessCode }),
  });
}
