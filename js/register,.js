// js/register.js — registrazione (coerenza: niente token salvato qui)

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

        // Coerenza scelta: niente auto-login qui.
        alert("Registrazione avvenuta! Ora effettua il login.");
        window.location.href = "../login.html";
      } catch (err) {
        alert("Errore registrazione: " + err.message);
      }
    });
  }
});

