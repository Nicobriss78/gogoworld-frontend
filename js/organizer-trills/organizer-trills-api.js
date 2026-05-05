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
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Trill API error: ${res.status} ${text}`);
  }

  return res.json();
}

export function fetchMyTrills() {
  return fetchJson("/trills/mine");
}

export function sendTrill(trillId) {
  return fetchJson(`/trills/${trillId}/send`, {
    method: "POST",
  });
}
