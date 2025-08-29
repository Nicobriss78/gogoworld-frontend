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
    box.className = "alert";
    main.prepend(box);
  }
  box.textContent = message;
  box.dataset.type = type; // "error" | "success"
  if (autoHideMs > 0) {
    setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const btnRegister = document.getElementById("btnRegister");
  const btnHome = document.getElementById("btnHome");

  if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      // FIX: percorso corretto della pagina di registrazione
      window.location.href = "pages/register.html";
    });
  }
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }

  // Ricava ruolo desiderato (scelto in index.html)
  function getDesiredRole() {
    const r = sessionStorage.getItem("desiredRole");
    return r === "organizzatore" ? "organizzatore" : "partecipante";
  }

  // Login submit
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.getElementById("email")?.value || "").trim();
    const password = document.getElementById("password")?.value || "";

    if (!email || !password) {
      showAlert("Inserisci email e password", "error", { autoHideMs: 3000 });
      return;
    }

    try {
      const res = await apiPost("/users/login", { email, password });
      if (!res.ok || !res.token) {
        showAlert(res.error || "Credenziali non valide", "error", { autoHideMs: 4000 });
        return;
      }

      // Salva token
      localStorage.setItem("token", res.token);

      // Imposta ruolo di sessione lato FE e notifica BE (eco, nessuna persistenza)
      const role = getDesiredRole();
      await apiPost("/users/session-role", { role });

      // Verifica chi sono
      const me = await apiGet("/users/me", res.token);
      if (!me || !me.ok) {
        showAlert("Errore nel recupero profilo", "error", { autoHideMs: 4000 });
        return;
      }

      // Redirect in base al ruolo richiesto
      if (role === "organizzatore") {
        window.location.href = "organizzatore.html";
      } else {
        window.location.href = "partecipante.html";
      }
    } catch (err) {
      showAlert("Errore di rete o server non raggiungibile", "error", { autoHideMs: 4000 });
    }
  });
});









