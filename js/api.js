// js/api.js — wrapper Fetch con retry/backoff e gestione errori uniformi
// (Versione P25 compatibile con il tuo backup + auto-token nei wrapper rooms/DM)

// ===== Base API: reverse-proxy (Netlify/prod) → "/api"
function resolveApiBase() {
  return "/api";
}
const API_BASE = resolveApiBase();

// ===== Utility: sleep per backoff
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// ===== Fetch con retry su 502/503/504
async function fetchWithRetry(url, options = {}) {
  const retryOn = new Set([502, 503, 504]);
  const delays = [500, 1500, 3000]; // ms

  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, options);
      if (!retryOn.has(res.status)) return res;

      // status "ritentabile"
      if (attempt < delays.length) {
        try {
          window.dispatchEvent(
            new CustomEvent("api:status", {
              detail: { phase: "retry", attempt: attempt + 1, status: res.status },
            })
          );
        } catch {}
        await sleep(delays[attempt]);
        attempt++;
        continue;
      }
      // esauriti i tentativi
      return res;
    } catch (e) {
      // errore di rete: ritenta se rimangono tentativi
      if (attempt < delays.length) {
        await sleep(delays[attempt]);
        attempt++;
        continue;
      }
      throw e;
    }
  }
}

// ===== Helpers comuni
function getStoredToken() {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  } catch {
    return null;
  }
}

function buildHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ===== Core fetch (uniforma esiti e messaggi di errore)
async function apiFetch(path, { method = "GET", body, token } = {}) {
  const url = `${API_BASE}${path}`;
  const headers = buildHeaders(token);

  let fetchBody;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = typeof body === "string" ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetchWithRetry(url, { method, headers, body: fetchBody });
  } catch (networkErr) {
    return { ok: false, status: 0, error: "NETWORK_ERROR", message: networkErr?.message || "Errore di rete" };
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg =
      (isJson ? data?.message || data?.error : String(data)) ||
      `HTTP ${res.status} – ${res.statusText || "Errore"}`;
    return { ok: false, status: res.status, error: "HTTP_ERROR", message: msg, payload: data };
  }

  return data ?? { ok: true };
}

// ===== Primitive low-level (come nel tuo backup)
export async function apiGet(path, token) {
  return apiFetch(path, { method: "GET", token });
}
export async function apiPost(path, body = {}, token) {
  return apiFetch(path, { method: "POST", body, token });
}
export async function apiDelete(path, token) {
  return apiFetch(path, { method: "DELETE", token });
}
export async function apiPut(path, body = {}, token) {
  return apiFetch(path, { method: "PUT", body, token });
}

// ===== Helper diagnostico ruoli/token (come nel tuo backup)
export async function whoami(token) {
  return apiGet("/users/whoami", token ?? getStoredToken());
}

// ===== Profilo utente (C1) – invariato
export async function getMyProfile(token) {
  return apiGet("/profile/me", token ?? getStoredToken());
}
export async function updateMyProfile(body = {}, token) {
  return apiPut("/profile/me", body, token ?? getStoredToken());
}
export async function getPublicProfile(userId) {
  return apiGet(`/profile/${userId}`);
}

// ===== Messaggio di errore uniforme (come nel tuo backup)
export function apiErrorMessage(result, fallback = "Errore") {
  if (!result) return fallback;
  if (result.ok === false) return result.message || result.error || fallback;
  if (typeof result === "object" && result.error) return result.error;
  return fallback;
}

/* =====================================================================
   DM (coerente con il tuo backup, ma ora auto-token)
   ===================================================================== */
export async function listThreads(token) {
  return apiGet("/dm/threads", token ?? getStoredToken());
}
export async function listMessages(userId, token) {
  return apiGet(`/dm/threads/${encodeURIComponent(userId)}/messages`, token ?? getStoredToken());
}
export async function sendMessage(userId, text, token) {
  return apiPost("/dm/messages", { recipientId: userId, text }, token ?? getStoredToken());
}
export async function markRead(userId, upTo, token) {
  return apiPost(`/dm/threads/${encodeURIComponent(userId)}/read`, { upTo }, token ?? getStoredToken());
}
export async function getUnreadCount(token) {
  return apiGet("/dm/unread-count", token ?? getStoredToken());
}

/* =====================================================================
   ROOMS – Evento pubblico (come nel tuo backup, + auto-token)
   ===================================================================== */
export async function openOrJoinEvent(eventId, token) {
  return apiPost(`/rooms/event/${encodeURIComponent(eventId)}/open-or-join`, {}, token ?? getStoredToken());
}
export async function getEventRoomMeta(eventId, token) {
  return apiGet(`/rooms/event/${encodeURIComponent(eventId)}`, token ?? getStoredToken());
}
export async function listRoomMessages(roomId, params = {}, token) {
  const q = [];
  if (params.before) q.push(`before=${encodeURIComponent(params.before)}`);
  if (params.after) q.push(`after=${encodeURIComponent(params.after)}`);
  if (params.limit) q.push(`limit=${encodeURIComponent(params.limit)}`);
  const qs = q.length ? `?${q.join("&")}` : "";
  return apiGet(`/rooms/${encodeURIComponent(roomId)}/messages${qs}`, token ?? getStoredToken());
}
export async function postRoomMessage(roomId, text, token) {
  return apiPost(`/rooms/${encodeURIComponent(roomId)}/messages`, { text }, token ?? getStoredToken());
}
export async function markRoomRead(roomId, upTo, token) {
  return apiPost(`/rooms/${encodeURIComponent(roomId)}/read`, { upTo }, token ?? getStoredToken());
}
export async function getRoomsUnreadCount(token = getStoredToken()) {
  if (!token) return { ok: false, status: 401, unread: 0 };
  return apiGet(`/rooms/unread-count`, token);
}
