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
  try { box.scrollIntoView({ block: "start", behavior: "smooth" }); } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const goHome = document.getElementById("goHome");

  if (goHome) {
    goHome.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const name = document.getElementById("name")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();
    const role = document.getElementById("role")?.value?.trim() || "participant"; // participant|organizer

    // PATCH: memorizza anche la scelta ruolo per il login successivo
    if (role === "organizer" || role === "participant") {
      try { sessionStorage.setItem("desiredRole", role); } catch {}
    }

    if (!email || !password) {
      showAlert("Inserisci email e password.", "error", { autoHideMs: 3500 });
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    try {
      // Endpoint corretto: POST /api/users
      const res = await apiPost("/users", { name, email, password, role });

      // L’API wrapper ritorna { ok:false,... } SOLO in errore.
      // In successo ritorna il payload puro (senza 'ok').
      // Consideriamo "successo" anche se troviamo campi attesi (_id/token).
      const isBackendError = res?.ok === false;
      const seemsSuccessPayload = !!(res && (res._id || res.token || res.email));

      if (isBackendError && !seemsSuccessPayload) {
        throw new Error(res?.error || "Registrazione fallita");
      }

      // Successo: blocca doppio click, mostra banner, resetta form e fai redirect
      showAlert("Registrazione avvenuta! Accedi per completare il profilo...", "success", { autoHideMs: 2000 });
      try { form.reset(); } catch {}
      if (submitBtn) submitBtn.disabled = true;
      try { sessionStorage.setItem("postLoginRedirect", "/profile.html"); } catch {}

      setTimeout(() => {
        window.location.href = "../login.html";
      }, 1200);
    } catch (err) {
      console.error("[register] errore:", err);
      showAlert("Errore registrazione: " + (err?.message || "Operazione non riuscita"), "error", { autoHideMs: 4000 });
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});

