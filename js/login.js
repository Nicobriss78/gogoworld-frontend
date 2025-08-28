// js/login.js — gestione Login
// TODO UI/UX Overhaul:
// - Sostituire showAlert() con componente notifiche standard (gwNotify)
// - Validazione form con messaggi inline sotto i campi (accessibile, aria-live)
// - Pulsante con stato "loading" e spinner coerente

import { apiPost, apiGet } from "./api.js";

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
  const form = document.getElementById("loginForm");
  const btnRegister = document.getElementById("goRegister");
  const btnHome = document.getElementById("goHome");

  if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      window.location.href = "register.html";
    });
  }
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const desiredRole = sessionStorage.getItem("desiredRole"); // può essere null

    try {
      // 1) Login
      const loginRes = await apiPost("/users/login", { email, password });
      if (!loginRes?.ok || !loginRes?.token) {
        throw new Error(loginRes?.error || "Credenziali non valide");
      }

      // 2) Salva token
      const token = loginRes.token;
      localStorage.setItem("token", token);

      // 3) Determina ruolo da usare
      let roleToUse = desiredRole;
      if (!roleToUse) {
        const me = await apiGet("/users/me", token);
        const roleFromDb = me?.user?.role || "participant";
        roleToUse = roleFromDb;
      }

      // 4) Notifica ruolo di sessione al backend
      await apiPost("/users/session-role", { role: roleToUse }, token);

      // 5) Redirect coerente
      if (roleToUse === "organizer") {
        window.location.href = "organizzatore.html";
      } else {
        window.location.href = "partecipante.html";
      }
    } catch (err) {
      showAlert("Login fallito: " + (err?.message || "Operazione non riuscita"), "error", { autoHideMs: 3500 });
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});






