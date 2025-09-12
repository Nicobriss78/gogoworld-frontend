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
// Notifiche unificate (accessibili)
export function gwNotify(message, type = "info", opts = {}) {
  const { autoHideMs = 2500, containerSelector = "main" } = opts;
  const root = document.querySelector(containerSelector) || document.body;

  // Riusa un singolo contenitore comune
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    box.className = "alert";
    root.prepend(box);
    // Accessibilità
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
  }

  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = String(message ?? "");

  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}


