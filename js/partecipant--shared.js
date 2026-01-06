// js/participant-shared.js
// Utilità condivise Area Partecipante (HOME/MAPPA/altre schede)

import { getMyProfile } from "./api.js";

/**
 * Banner messaggi (error/success/info) con auto-hide opzionale.
 * NOTE: la agganciamo anche a window.showAlert per compatibilità con script inline.
 */
export function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;

  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
  }

  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    window.clearTimeout(showAlert.__t);
    showAlert.__t = window.setTimeout(() => {
      try {
        const b = document.getElementById("alertBox");
        if (b) b.remove();
      } catch {}
    }, autoHideMs);
  }
}

// compat: permette a script non-module (inline) di chiamarla
try {
  window.showAlert = showAlert;
} catch {}

/** Piccolo helper status -> <p> coerente con CSS esistente */
export function renderStatusP(status) {
  const labelMap = {
    ongoing: "In corso",
    imminent: "Imminente",
    future: "Futuro",
    concluded: "Concluso",
    past: "Passato",
  };
  const text = labelMap[status] || status;
  return `<p class="status ${status}">${text}</p>`;
}

/**
 * Banner “Completa il profilo” (mostra se nickname mancante).
 * Manteniamo la logica identica a quella che avevi in partecipante.js.
 */
export async function maybeShowProfileNag(token) {
  try {
    if (sessionStorage.getItem("profileNag") === "0") return;

    const res = await getMyProfile(token);
    const user = (res && (res.user || res.profile || res)) || {};
    const nickname = (user.nickname || "").trim();

    if (!nickname) {
      showAlert("Completa il profilo: aggiungi un nickname 🙂", "info", { autoHideMs: 3000 });
    }
  } catch {
    // silenzioso: non è bloccante
  }
}
