// js/register.js — submit registrazione
//
// Flusso:
// - Invio POST /api/users/register
// - Se ok: salva token e reindirizza a login.html
// - Pulsante "Torna alla homepage"

import { apiPost } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const btnHome = document.getElementById("goHome");

  if (btnHome) {
    btnHome.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const role = document.getElementById("role").value;

      try {
        const res = await apiPost("/users/register", { name, email, password, role });
        if (!res.ok) throw new Error(res.error || "Registrazione fallita");

        // Salvo token e reindirizzo
        localStorage.setItem("token", res.token);
        alert("Registrazione avvenuta con successo! Ora puoi accedere.");
        window.location.href = "../login.html";
      } catch (err) {
        alert("Errore registrazione: " + err.message);
      }
    });
  }
});
