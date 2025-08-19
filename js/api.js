/* GoGo.World – api.js
 * Wrapper fetch con endpoint RELATIVI (/api/*), gestione token, JSON, errori e timeout.
 * Esporta un oggetto globale: window.API
 */

(function () {
  const TOKEN_KEY = "ggw_token";
  const DEFAULT_TIMEOUT_MS = 15000;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  }
  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }
  function clearToken() { setToken(""); }

  function ensureLeadingSlash(path) {
    if (!path) return "/";
    return path.startsWith("/") ? path : `/${path}`;
  }

  function buildQuery(params) {
    if (!params || typeof params !== "object") return "";
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) v.forEach(item => sp.append(k, String(item)));
      else sp.append(k, String(v));
    });
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
  }

  async function request(method, path, { params, body, headers, auth = true, timeoutMs } = {}) {
    const url = ensureLeadingSlash(path) + buildQuery(params);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const reqHeaders = Object.assign(
      { "Accept": "application/json" },
      headers || {}
    );

    // Corpo JSON se presente
    let fetchBody;
    if (body !== undefined && body !== null) {
      reqHeaders["Content-Type"] = "application/json";
      fetchBody = JSON.stringify(body);
    }

    // Bearer
    if (auth) {
      const token = getToken();
      if (token) reqHeaders["Authorization"] = `Bearer ${token}`;
    }

    let resp;
    try {
      resp = await fetch(url, {
        method: method.toUpperCase(),
        headers: reqHeaders,
        body: fetchBody,
        signal: controller.signal,
        credentials: "omit" // niente cookie; usiamo solo Bearer
      });
    } catch (err) {
      clearTimeout(t);
      throw {
        ok: false,
        network: true,
        error: "NETWORK_ERROR",
        details: err && (err.name || err.message) || "Network failure"
      };
    } finally {
      clearTimeout(t);
    }

    const isJson = resp.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await resp.json().catch(() => ({})) : await resp.text();

    if (!resp.ok) {
      // Se 401, opzionalmente puliamo token per forzare re-login (comportamento soft)
      if (resp.status === 401) {
        // clearToken(); // scommentare se vogliamo forzare il logout immediato
      }
      throw {
        ok: false,
        status: resp.status,
        error: (isJson && (payload.error || payload.message)) || `HTTP_${resp.status}`,
        details: isJson ? payload : String(payload || "")
      };
    }

    return isJson ? payload : { ok: true, data: payload };
  }

  // API pubbliche
  const API = {
    // Token
    getToken, setToken, clearToken,

    // Metodi HTTP
    get: (path, opts) => request("GET", path, opts),
    post: (path, opts) => request("POST", path, opts),
    put: (path, opts) => request("PUT", path, opts),
    patch: (path, opts) => request("PATCH", path, opts),
    del: (path, opts) => request("DELETE", path, opts),

    // Helper comuni per endpoints noti (facoltativi)
    users: {
      login: (email, password, desiredRole) => API.post("/api/users/login", { body: { email, password, desiredRole } }),
      register:(data) => API.post("/api/users/register", { body: data }),
      me: () => API.get("/api/users/me")
    },
    events: {
      list: (filters) => API.get("/api/events", { params: filters }),
      get: (id) => API.get(`/api/events/${id}`),
      mine: () => API.get("/api/events/mine"),
      create: (data) => API.post("/api/events", { body: data }),
      update: (id, data) => API.put(`/api/events/${id}`, { body: data }),
      remove: (id) => API.del(`/api/events/${id}`)
    }
  };

  // Esportazione globale
  window.API = API;
})();
