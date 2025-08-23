// js/utils.js — GoGo.World — Utility leggere e non invasive
// Include: escape HTML, querystring helpers, date helpers, DOM helpers, storage helpers.

(function (global) {
  const Utils = {};

  // --- String/HTML
  Utils.escapeHtml = function (s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[m]));
  };

  // --- Querystring
  Utils.qs = new URLSearchParams(global.location ? global.location.search : "");
  Utils.getQueryParam = function (name, fallback = null) {
    try {
      if (!name) return fallback;
      return Utils.qs.get(name) ?? fallback;
    } catch { return fallback; }
  };

  // --- Date helpers
  Utils.toLocalDateTimeInputValue = function (iso) {
    // Converte ISO -> valore per <input type="datetime-local">
    try {
      if (!iso) return "";
      const d = new Date(iso);
      const adj = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return adj.toISOString().slice(0, 16);
    } catch { return ""; }
  };

  Utils.formatDateTime = function (val) {
    try { return val ? new Date(val).toLocaleString() : ""; } catch { return String(val || ""); }
  };

  // --- DOM helpers
  Utils.$ = function (sel, root) { return (root || document).querySelector(sel); };
  Utils.$$ = function (sel, root) { return Array.from((root || document).querySelectorAll(sel)); };
  Utils.on = function (el, ev, fn, opts) { if (el && el.addEventListener) el.addEventListener(ev, fn, opts); };

  // --- Storage helpers (safe)
  Utils.safeSet = function (k, v) { try { localStorage.setItem(k, v); } catch {} };
  Utils.safeGet = function (k, fb = "") { try { return localStorage.getItem(k) ?? fb; } catch { return fb; } };
  Utils.safeDel = function (k) { try { localStorage.removeItem(k); } catch {} };

  // --- Throttle/Debounce leggeri
  Utils.debounce = function (fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  };
  Utils.throttle = function (fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, args);
      }
    };
  };

  // Espone globalmente
  global.Utils = Utils;
})(window);

