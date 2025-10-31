// js/api.js — wrapper Fetch con retry/backoff e gestione errori uniformi

// Base API: reverse-proxy (Netlify/prod) → "/api"
function resolveApiBase() {
  return "/api";
}
const API_BASE = resolveApiBase();

// Sleep helper per il backoff
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/**
 * fetchWithRetry(url, options)
 * - Riprova su 502/503/504 con backoff [500ms, 1500ms, 3000ms]
 * - Dispatch di CustomEvent "api:status" { detail: { phase: 'retry', attempt, status } }
 * → puoi intercettarlo nel FE per mostrare un banner "server in riattivazione…"
 */
async function fetchWithRetry(url, options = {}) {
  const retryOn = new Set([502, 503, 504]);
  const delays = [500, 1500, 3000]; // 3 tentativi totali (1° + 2 retry)
  let lastErr = null;

  for (let attempt = 0; attempt < delays.length + 1; attempt++) {
    try {
      const res = await fetch(url, options);
      // Se non è uno status "ritentabile", restituisci subito
      if (!retryOn.has(res.status)) return res;

      // Status ritentabile → dispatch evento e ritenta (se restano tentativi)
      if (attempt < delays.length) {
        try {
          window.dispatchEvent(new CustomEvent("api:status", {
            detail: { phase: "retry", attempt: attempt + 1, status: res.status }
          }));
        } catch {}
        await sleep(delays[attempt]);
        continue;
      }
      // Esauriti i tentativi → restituisci comunque la response (fallirà poi a valle)
      return res;
    } catch (e) {
      // Errori di rete (offline/DNS) → ritenta, poi fallisci
      lastErr = e;
      if (attempt < delays.length) {
        try {
          window.dispatchEvent(new CustomEvent("api:status", {
            detail: { phase: "retry", attempt: attempt + 1, status: 0, error: String(e?.message || e) }
          }));
        } catch {}
        await sleep(delays[attempt]);
        continue;
      }
      throw e;
    }
  }
  // Fallback (in pratica non si arriva qui)
  if (lastErr) throw lastErr;
  return fetch(url, options);
}

// Recupero token sicuro da localStorage
function getToken(){
  try { return localStorage.getItem("token"); } catch { return null; }
}

// --- Fetch uniforme con auth, body JSON e gestione errori ---
async function apiFetch(path, { method = "GET", body, token } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let fetchBody;
  if (method.toUpperCase() !== "GET" && body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = typeof body === "string" ? body : JSON.stringify(body);
  }

  let res;
  try {
    // ⬇️ usa fetchWithRetry al posto di fetch
   const opts = { method, headers, body: fetchBody };
   if (method.toUpperCase() === "GET") opts.cache = "no-store";
   res = await fetchWithRetry(url, opts);  } catch (networkErr) {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
      message: networkErr?.message || "Errore di rete"
    };
  }

  let data = null;
  let text = "";
  const status = res.status;
  try {
    data = await res.json();
  } catch {
    try { text = await res.text(); } catch {}
  }

  if (!res.ok) {
    // Auto-logout: segnala 401 al FE (admin.js ascolta "auth:expired")
    if (status === 401) {
      try { window.dispatchEvent(new CustomEvent("auth:expired")); } catch {}
    }
    const message = (data && (data.error || data.message)) || (text || `HTTP ${status}`);
    return { ok: false, status, error: data?.error || `HTTP_${status}`, message, data: data || null };
  }

  return { ok: true, status, ...(data != null ? data : { data: text }) };
}

// Shortcuts
export async function apiGet(path, token) { return apiFetch(path, { method: "GET", token }); }
export async function apiPost(path, body = {}, token){ return apiFetch(path, { method: "POST", body, token }); }
export async function apiDelete(path, token) { return apiFetch(path, { method: "DELETE", token }); }
export async function apiPut(path, body = {}, token) { return apiFetch(path, { method: "PUT", body, token }); }

// Helper diagnostico ruoli/token
export async function whoami(token) {
  return apiGet("/users/whoami", token ?? getToken());
}

// === Profilo utente (C1) ===
export async function getMyProfile(token) {
  return apiGet("/profile/me", token ?? getToken());
}
export async function updateMyProfile(body = {}, token) {
  return apiPut("/profile/me", body, token ?? getToken());
}
export async function getPublicProfile(userId) {
  return apiGet(`/profile/${userId}`);
}

// Messaggio di errore uniforme dal risultato di apiFetch
export function apiErrorMessage(result, fallback = "Errore") {
  if (!result) return fallback;
  if (result.ok === false) return result.message || result.error || fallback;
  if (typeof result === "object" && result.error) return result.error;
  return fallback;
}

// === API DM (auto-token) ===
export async function listThreads(token) {
  return await apiGet("/dm/threads", token ?? getToken());
}
export async function listMessages(userId, token) {
  return await apiGet(`/dm/threads/${userId}/messages`, token ?? getToken());
}
export async function sendMessage(userId, text, token) {
  return await apiPost("/dm/messages", { recipientId: userId, text }, token ?? getToken());
}
export async function markRead(userId, upTo, token) {
  return await apiPost(`/dm/threads/${userId}/read`, { upTo }, token ?? getToken());
}
export async function getUnreadCount(token) {
  return await apiGet("/dm/unread-count", token ?? getToken());
}

// === API ROOMS (Evento pubblico) — auto-token ===
export async function openOrJoinEvent(eventId, token) {
  return await apiPost(`/rooms/event/${eventId}/open-or-join`, {}, token ?? getToken());
}
export async function getEventRoomMeta(eventId, token) {
  return await apiGet(`/rooms/event/${eventId}`, token ?? getToken());
}
export async function listRoomMessages(roomId, params={}, token) {
  const q = [];
  if (params.before) q.push(`before=${encodeURIComponent(params.before)}`);
  if (params.limit) q.push(`limit=${encodeURIComponent(params.limit)}`);
  const qs = q.length ? `?${q.join("&")}` : "";
  return await apiGet(`/rooms/${roomId}/messages${qs}`, token ?? getToken());
}
export async function postRoomMessage(roomId, text, token) {
  return await apiPost(`/rooms/${roomId}/messages`, { text }, token ?? getToken());
}
export async function markRoomRead(roomId, upTo, token) {
  return await apiPost(`/rooms/${roomId}/read`, { upTo }, token ?? getToken());
}
export async function getRoomsUnreadCount(
  token = (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null)
) {
  // se manca il token, comportati come "non autorizzato"
  if (!token) {
    return { ok: false, status: 401, unread: 0 };
  }
  // passa il token ad apiGet (coerente con come chiami /users/me, ecc.)
  return await apiGet(`/rooms/unread-count`, token);
}
