// js/api.js — wrapper Fetch (proxy relativo /api/*)
//
// Opzione B: tutte le chiamate passano da un reverse-proxy (Netlify in staging,
// reverse-proxy del "server unico" in produzione). Base fissa: "/api".
function resolveApiBase() {
return "/api";
}

const API_BASE = resolveApiBase();

// --- PATCH: fetch uniforme con auth, body JSON e gestione errori ---
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
    res = await fetch(url, { method, headers, body: fetchBody });
  } catch (networkErr) {
    return { ok: false, status: 0, error: "NETWORK_ERROR", message: networkErr?.message || "Errore di rete" };
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
    const message = (data && (data.error || data.message)) || (text || `HTTP ${status}`);
    return { ok: false, status, error: data?.error || `HTTP_${status}`, message, data: data || null };
  }

  return { ok: true, status, ...(data != null ? data : { data: text }) };
}

export async function apiGet(path, token) { return apiFetch(path, { method: "GET", token }); }
export async function apiPost(path, body = {}, token){ return apiFetch(path, { method: "POST", body, token }); }
export async function apiDelete(path, token) { return apiFetch(path, { method: "DELETE", token }); }
export async function apiPut(path, body = {}, token) {
  return apiFetch(path, { method: "PUT", body, token });
}

// --- PATCH MINIMA: helper diagnostico ruoli/token ---
export async function whoami(token) {
  return apiGet("/users/whoami", token);
}
