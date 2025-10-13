/* =========================================================
   GoGoWorld.life – API Client (auto-token wrappers)
   VERSIONE: P25-API-2025-10-13
   NOTE:
   - Le primitive apiGet/apiPost... accettano un token opzionale.
   - I wrapper (openOrJoinEvent, listRoomMessages, ecc.) recuperano
     il token automaticamente da localStorage e lo passano alle primitive.
   - Standardizza tutte le chiamate FE su questi wrapper per evitare 401.
   ========================================================= */

/* -------- Config base -------- */
const API_BASE =
  (typeof window !== "undefined" && window._API_BASE) ||
  "/api"; // Netlify proxy verso Render già gestito dal tuo setup

/* -------- Helpers -------- */
function buildHeaders(token, extra = {}) {
  const h = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function handleResponse(res) {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const err = new Error(
      (data && data.message) ||
        `HTTP ${res.status} – ${res.statusText || "Errore di rete"}`
    );
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/* -------- Primitive low-level (accettano token opzionale) -------- */
export async function apiGet(path, token, extraHeaders = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: buildHeaders(token, extraHeaders),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function apiPost(path, body = {}, token, extraHeaders = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(token, extraHeaders),
    body: JSON.stringify(body),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function apiPut(path, body = {}, token, extraHeaders = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: buildHeaders(token, extraHeaders),
    body: JSON.stringify(body),
    credentials: "include",
  });
  return handleResponse(res);
}

export async function apiDelete(path, token, extraHeaders = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: buildHeaders(token, extraHeaders),
    credentials: "include",
  });
  return handleResponse(res);
}

/* -------- Token access -------- */
function getToken() {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

/* =========================================================
   WRAPPERS AD USO UI (AUTO-TOKEN)
   ========================================================= */

/* --- EVENTI & ROOMS --- */
export async function openOrJoinEvent(eventId) {
  const token = getToken();
  return apiPost(`/rooms/event/${encodeURIComponent(eventId)}/open-or-join`, {}, token);
}

export async function unlockEventRoom(eventId, accessCode) {
  const token = getToken();
  return apiPost(
    `/rooms/event/${encodeURIComponent(eventId)}/unlock`,
    { accessCode },
    token
  );
}

export async function getEventRoomMeta(eventId) {
  const token = getToken();
  return apiGet(`/rooms/event/${encodeURIComponent(eventId)}`, token);
}

/* --- MESSAGGI ROOM --- */
export async function listRoomMessages(roomId, { page = 1, limit = 50 } = {}) {
  const token = getToken();
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiGet(`/rooms/${encodeURIComponent(roomId)}/messages?${q}`, token);
}

export async function postRoomMessage(roomId, text) {
  const token = getToken();
  return apiPost(
    `/rooms/${encodeURIComponent(roomId)}/messages`,
    { text },
    token
  );
}

export async function markRoomRead(roomId) {
  const token = getToken();
  return apiPost(`/rooms/${encodeURIComponent(roomId)}/read`, {}, token);
}

/* --- UNREAD COUNT --- */
export async function getUnreadCount() {
  const token = getToken();
  return apiGet(`/rooms/unread-count`, token);
}

/* --- UTILITY AUTH --- */
export function isLoggedIn() {
  return !!getToken();
}

export function requireAuthOrRedirect(loginUrl = "../pages/login.html") {
  if (!isLoggedIn()) {
    window.location.href = loginUrl;
    return false;
  }
  return true;
}
