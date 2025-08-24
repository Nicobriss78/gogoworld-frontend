// js/login.js — gestione Login
//
// Flusso:
// - Legge ruolo desiderato da sessionStorage
// - Invia POST /api/users/login
// - Se ok, salva token in localStorage e notifica backend del ruolo di sessione
// - Redirect a organizzatore.html o partecipante.html
// - Pulsanti "Registrati" e "Torna alla homepage"

import { apiPost } from "./api.js";

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

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const desiredRole = sessionStorage.getItem("desiredRole");

      try {
        const loginRes = await apiPost("/users/login", { email, password });
        if (!loginRes.ok) throw new Error(loginRes.error || "Errore login");

        // Salva token
        localStorage.setItem("token", loginRes.token);

        // Notifica ruolo di sessione al backend
        if (desiredRole) {
          await apiPost("/users/session-role", { role: desiredRole });
        }

        // Redirect in base al ruolo
        if (desiredRole === "organizer") {
          window.location.href = "organizzatore.html";
        } else {
          window.location.href = "partecipante.html";
        }
      } catch (err) {
        alert("Login fallito: " + err.message);
      }
    });
  }
});
