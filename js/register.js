// js/register.js — registrazione (coerenza: niente auto-login)
// TODO UI/UX Overhaul:
// - Validazione client-side con messaggi inline per ciascun campo
// - Feedback di successo con redirect temporizzato e toast informativo
// - Accessibilità: aria-invalid, aria-describedby, focus management

import { apiPost } from "./api.js";

// Banner messaggi (error/success) con auto-hide opzionale
function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
  }
  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const btnHome = document.getElementById("goHome");

  if (btnHome) {
    btnHome.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "../index.html";
    });
  }

  if (!form) {
    console.error("[register] Form #registerForm non trovato");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const name = (document.getElementById("name")?.value || "").trim();
    const email = (document.getElementById("email")?.value || "").trim();
    const password = (document.getElementById("password")?.value || "").trim();
    const role = document.getElementById("role")?.value || "participant";

    if (!email || !password) {
      showAlert("Inserisci email e password.", "error", { autoHideMs: 3500 });
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    try {
      const res = await apiPost("/users", { name, email, password, role });
      if (!res?.ok) {
        throw new Error(res?.error || "Registrazione fallita");
      }

      showAlert("Registrazione avvenuta! Reindirizzamento al login…", "success", { autoHideMs: 2000 });
      setTimeout(() => { window.location.href = "../login.html"; }, 1600);
    } catch (err) {
      console.error("[register] errore:", err);
      showAlert("Errore registrazione: " + (err?.message || "Operazione non riuscita"), "error", { autoHideMs: 4000 });
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});



