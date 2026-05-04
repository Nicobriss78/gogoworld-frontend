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
    const text = await res.text().catch(() => "");
    throw new Error(`Access API error: ${path} (${res.status}) ${text}`);
  }

  return res.json();
}

export async function fetchEventAccess(eventId) {
  return fetchJson(`/events/${eventId}/access`);
}

export async function inviteUserToPrivateEvent(eventId, email) {
  return fetchJson(`/events/${eventId}/invite`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function banUserFromPrivateEvent(eventId, userId) {
  return fetchJson(`/events/${eventId}/ban`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function unbanUserFromPrivateEvent(eventId, userId) {
  return fetchJson(`/events/${eventId}/unban`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}
