// js/utils.js — funzioni di utilità comuni

// Escape HTML per prevenire injection
export function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Format data in locale
export function formatDate(date) {
  try {
    return new Date(date).toLocaleString("it-IT");
  } catch {
    return "";
  }
}

// Recupera token salvato
export function getToken() {
  return localStorage.getItem("token");
}

// Clear sessione
export function clearSession() {
  localStorage.removeItem("token");
  sessionStorage.clear();
}


