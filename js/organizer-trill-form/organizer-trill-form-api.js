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
    throw new Error(`Trill form API error: ${path} (${res.status}) ${text}`);
  }

  return res.json();
}

export function fetchOrganizerEvent(eventId) {
  return fetchJson(`/events/${eventId}`);
}

export function createTrillDraft(payload) {
  return fetchJson("/trills", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
