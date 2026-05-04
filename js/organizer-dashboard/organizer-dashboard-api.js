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
  const [eventsPayload, promosPayload, trillsPayload] = await Promise.allSettled([
    fetchJson("/events/mine/list"),
    fetchJson("/banners/mine"),
    fetchJson("/trills/mine"),
  ]);

  const events =
    eventsPayload.status === "fulfilled" && Array.isArray(eventsPayload.value?.events)
      ? eventsPayload.value.events
      : [];

  const promos =
    promosPayload.status === "fulfilled" && Array.isArray(promosPayload.value?.data)
      ? promosPayload.value.data
      : [];

  const trills =
    trillsPayload.status === "fulfilled" && Array.isArray(trillsPayload.value?.trills)
      ? trillsPayload.value.trills
      : [];

  return { events, promos, trills };
}
