// js/register.js — registrazione (coerenza: niente auto-login)
// TODO UI/UX Overhaul:
// - Validazione client-side con messaggi inline per ciascun campo
// - Feedback di successo con redirect temporizzato e toast informativo
// - Accessibilità: aria-invalid, aria-describedby, focus management


import { apiPost } from "./api.js";

function showAlert(message, type = "error") {
  const main = document.querySelector("main") || document.body;
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
  }
  box.className = `alert ${type}`;
  box.textContent = message;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const btnHome = document.getElementById("goHome");

  if (btnHome) {
    btnHome.addEventListener("click", (e) => {
      e.preventDefault();
      // torna alla Home 0
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
      showAlert("Inserisci email e password.", "error");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    try {
      const res = await apiPost("/users/register", { name, email, password, role });
      if (!res?.ok) {
        throw new Error(res?.error || "Registrazione fallita");
      }

      // Nota: nessun token salvato qui. Flusso: registrazione → login.
      showAlert("Registrazione avvenuta! Ora effettua il login.", "success");
      window.location.href = "../login.html";
    } catch (err) {
      console.error("[register] errore:", err);
      showAlert("Errore registrazione: " + (err?.message || "Operazione non riuscita"), "error");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});

