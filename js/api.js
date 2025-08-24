// js/api.js — wrapper Fetch (aggiunto supporto <meta name="api-base">)

function resolveApiBase() {
  // 1) Forzatura locale (debug/ambiente)
  const fromStorage = (typeof localStorage !== "undefined") ? localStorage.getItem("API_BASE") : null;
  if (fromStorage && /^https?:\/\//i.test(fromStorage)) return fromStorage.replace(/\/$/, "");

  // 2) Meta tag in index.html (config centralizzata)
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.content && /^https?:\/\//i.test(meta.content)) {
      return String(meta.content).replace(/\/$/, "");
    }
  }

  // 3) Variabile globale (iniettabile a build)
  if (typeof window !== "undefined" && window.__API_BASE) {
    return String(window.__API_BASE).replace(/\/$/, "");
  }

  // 4) Fallback: backend su Render
  return "https://gogoworld-api.onrender.com/api";
}

const API_BASE = resolveApiBase();

async function apiFetch(path, { method = "GET", body, token } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

  let data = null;
  try { data = await res.json(); } catch {
    return { ok: false, status: res.status, error: `HTTP_${res.status}`, message: "Invalid JSON response" };
  }
  if (!res.ok || data?.ok === false) {
    return { ok: false, status: res.status, error: data?.error || `HTTP_${res.status}`, message: data?.message || null };
  }
  return data;
}

export async function apiGet(path, token) { return apiFetch(path, { method: "GET", token }); }
export async function apiPost(path, body = {}, token){ return apiFetch(path, { method: "POST", body, token }); }
export async function apiDelete(path, token) { return apiFetch(path, { method: "DELETE", token }); }
