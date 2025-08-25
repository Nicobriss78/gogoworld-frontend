// js/register.js — registrazione (coerenza: niente auto-login)
// build-bump: 002

import { apiPost } from "./api.js";

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
      alert("Inserisci email e password.");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    try {
      const res = await apiPost("/users/register", { name, email, password, role });
      if (!res?.ok) {
        throw new Error(res?.error || "Registrazione fallita");
      }

      // Nota: nessun token salvato qui. Flusso: registrazione → login.
      alert("Registrazione avvenuta! Ora effettua il login.");
      window.location.href = "../login.html";
    } catch (err) {
      console.error("[register] errore:", err);
      alert("Errore registrazione: " + (err?.message || "Operazione non riuscita"));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
