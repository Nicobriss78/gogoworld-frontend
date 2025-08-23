// js/api.js — GoGo.World — API client unificato
// Obiettivi: gestione token coerente, headers uniformi, error handling consistente.
// Compatibilità: espone window.API.{get,post,put,delete,del} + helpers getToken/setToken/clearToken.

(function (global) {
  const API = {};

  // --- Token helpers (coerenti con codice esistente)
  function getToken() {
    try {
      return localStorage.getItem("token") || localStorage.getItem("ggw_token") || "";
    } catch {
      return "";
    }
  }
  function setToken(tok) {
    try {
      if (!tok) return;
      localStorage.setItem("token", tok);
      localStorage.setItem("ggw_token", tok);
    } catch {}
  }
  function clearToken() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("ggw_token");
    } catch {}
  }

  // --- Session role helpers (usati da alcune pagine)
  function getSessionRole() {
    try { return localStorage.getItem("sessionRole") || ""; } catch { return ""; }
  }
  function setSessionRole(role) {
    try { if (role) localStorage.setItem("sessionRole", role); } catch {}
  }

  // --- Utility interna
  function buildUrl(path, params) {
    const base = typeof path === "string" ? path : String(path || "");
    if (!params || Object.keys(params).length === 0) return base;
    const qs = new URLSearchParams(params);
    return `${base}${base.includes("?") ? "&" : "?"}${qs.toString()}`;
  }

  async function parseJsonSafe(res) {
    try { return await res.json(); } catch { return null; }
  }

  function isApiPath(p) {
    return typeof p === "string" && p.startsWith("/api/");
  }

  function normalizeError(status, data, fallbackMessage) {
    const err = new Error(
      (data && (data.message || data.error || data.msg)) ||
      fallbackMessage ||
      "Richiesta non riuscita"
    );
    err.status = status || 0;
    err.code = (data && (data.error || data.code)) || "HTTP_ERROR";
    err.details = data || null;
    return err;
  }

  async function request(method, path, { params, body, auth } = {}) {
    const url = buildUrl(path, params);
    const headers = { "Accept": "application/json" };
    const isJson = body !== undefined;

    if (isJson) headers["Content-Type"] = "application/json";

    // Auth: di default abilita per /api/*; può essere forzato con {auth:true/false}
    const shouldAuth = typeof auth === "boolean" ? auth : isApiPath(path);
    if (shouldAuth) {
      const tok = getToken();
      if (tok) headers["Authorization"] = `Bearer ${tok}`;
    }

    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: isJson ? JSON.stringify(body) : undefined,
    });

    // 204 No Content
    if (res.status === 204) return null;

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      throw normalizeError(res.status, data, `${method.toUpperCase()} ${path} failed`);
    }

    // Se il backend ritorna un token aggiornato, persistilo
    if (data && data.token) setToken(data.token);

    return data;
  }

  // --- API public surface
  API.get = (path, opts = {}) => request("GET", path, opts);
  API.post = (path, opts = {}) => request("POST", path, opts);
  API.put = (path, opts = {}) => request("PUT", path, opts);
  API.delete = (path, opts = {}) => request("DELETE", path, opts);
  API.del = API.delete; // alias

  API.getToken = getToken;
  API.setToken = setToken;
  API.clearToken = clearToken;

  API.getSessionRole = getSessionRole;
  API.setSessionRole = setSessionRole;

  // Esponi globalmente
  global.API = API;
})(window);

