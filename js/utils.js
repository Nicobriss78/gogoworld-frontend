/* GoGo.World – utils.js
 * Utility globali: ID, formattazioni, ruoli, querystring, storage namespaced.
 * Esporta un oggetto globale: window.GGW
 */

(function () {
  const NS = "ggw:";

  // --- Storage sicuro (best effort)
  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch {}
    },
    del(key) {
      try { localStorage.removeItem(NS + key); } catch {}
    }
  };

  // --- ID helpers
  function eventId(e) {
    if (!e) return null;
    return e._id || e.id || null;
  }

  // --- Querystring → object
  function parseQS(search) {
    const sp = new URLSearchParams(search || window.location.search || "");
    const obj = {};
    for (const [k, v] of sp.entries()) {
      if (obj[k] !== undefined) {
        if (Array.isArray(obj[k])) obj[k].push(v);
        else obj[k] = [obj[k], v];
      } else obj[k] = v;
    }
    return obj;
  }

  // --- Date & money format
  function formatDate(dateStr, locale = "it-IT", options) {
    try {
      const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
      return new Intl.DateTimeFormat(locale, options || { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    } catch { return String(dateStr || ""); }
  }

  function formatDateTime(dateStr, locale = "it-IT") {
    try {
      const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      }).format(d);
    } catch { return String(dateStr || ""); }
  }

  function formatMoney(amount, currency = "EUR", locale = "it-IT") {
    if (amount === null || amount === undefined || isNaN(amount)) return "";
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
    } catch {
      return `${Number(amount).toFixed(2)} ${currency}`;
    }
  }

  // --- Ruoli
  function getAuthInfo() {
    // NB: il progetto salva già token/user/role nel localStorage nativo (fuori namespace).
    // Forniamo helper che legge anche chiavi standard già usate.
    const userId = localStorage.getItem("userId") || null;
    const role = localStorage.getItem("role") || localStorage.getItem("currentRole") || null;
    return { userId, role };
  }

  function hasRole(target) {
    const { role } = getAuthInfo();
    return role === target;
  }

  function requireOrganizer() { return hasRole("organizer"); }
  function requireParticipant() { return hasRole("participant"); }

  // --- Assert semplice
  function assert(condition, msg = "Assertion failed") {
    if (!condition) throw new Error(msg);
  }

  // Export
  window.GGW = {
    storage,
    eventId,
    parseQS,
    formatDate,
    formatDateTime,
    formatMoney,
    roles: { hasRole, requireOrganizer, requireParticipant },
    assert
  };
})();
