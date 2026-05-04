const API_BASE = window.API_BASE || "https://gogoworld-api.onrender.com/api";

function getToken() {
  return localStorage.getItem("token");
}

async function fetchJson(path) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Dashboard API error: ${path} (${res.status})`);
  }

  return res.json();
}

export async function fetchDashboardData() {
  const [eventsPayload, promosPayload, trillsPayload] = await Promise.all([
    fetchJson("/events/mine/list"),
    fetchJson("/banners/mine"),
    fetchJson("/trills/mine"),
  ]);

  return {
    events: Array.isArray(eventsPayload?.events) ? eventsPayload.events : [],
    promos: Array.isArray(promosPayload?.data) ? promosPayload.data : [],
    trills: Array.isArray(trillsPayload?.trills) ? trillsPayload.trills : [],
  };
}
