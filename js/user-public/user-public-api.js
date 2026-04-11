/**
 * user-public-api.js
 * API reali della pagina user-public.
 * Nessun rendering, nessuna orchestrazione.
 */

function getAuthToken() {
  try {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("jwt") ||
      localStorage.getItem("jwt") ||
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("accessToken") ||
      null
    );
  } catch {
    return null;
  }
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`/api${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const payload = await parseJsonSafe(response);

  if (!response.ok || payload?.ok === false) {
    const error = new Error(
      payload?.message || payload?.error || `HTTP ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function fetchPublicProfile(userId) {
  const payload = await apiRequest(`/users/${encodeURIComponent(String(userId))}/public`);
  return payload?.data || null;
}

export async function fetchUserActivity(userId) {
  try {
    const payload = await apiRequest(`/users/${encodeURIComponent(String(userId))}/activity`);
    return {
      items: Array.isArray(payload?.data) ? payload.data : [],
      activityPrivate: false,
    };
  } catch (error) {
    if (error.status === 403 && error.payload?.error === "activity_private") {
      return {
        items: [],
        activityPrivate: true,
      };
    }
    throw error;
  }
}

export async function followUser(userId) {
  const payload = await apiRequest(
    `/users/${encodeURIComponent(String(userId))}/follow`,
    { method: "POST" }
  );

  return !!payload?.following;
}

export async function unfollowUser(userId) {
  const payload = await apiRequest(
    `/users/${encodeURIComponent(String(userId))}/follow`,
    { method: "DELETE" }
  );

  return !!payload?.following;
}
