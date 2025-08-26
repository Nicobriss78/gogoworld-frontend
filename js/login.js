// js/login.js — gestione Login
//
// Flusso:
// - Legge ruolo desiderato da sessionStorage
// - Invia POST /api/users/login
// - Se ok, salva token in localStorage
// - Se non c'è desiredRole, chiede il ruolo reale a /api/users/me
// - In ogni caso notifica backend del ruolo di sessione
// - Redirect a organizzatore.html o partecipante.html
// - Pulsanti "Registrati" e "Torna alla homepage"

import { apiPost, apiGet } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const btnRegister = document.getElementById("goRegister");
  const btnHome = document.getElementById("goHome");

  if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      // NOTE: percorso invariato come da versione attuale
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
    const desiredRole = sessionStorage.getItem("desiredRole"); // scelto in Home 0, può essere null

    try {
      // 1) Login
      const loginRes = await apiPost("/users/login", { email, password });
      if (!loginRes?.ok || !loginRes?.token) {
        throw new Error(loginRes?.error || "Errore login");
      }

      // 2) Salva token
      const token = loginRes.token;
      localStorage.setItem("token", token);

      // 3) Determina il ruolo da usare:
      // - se l'utente ha scelto dalla Home 0, rispettiamo quella scelta per la sessione
      // - altrimenti usiamo il ruolo reale dal backend (/users/me)
      let roleToUse = desiredRole;
      if (!roleToUse) {
        const me = await apiGet("/users/me", token);
        const roleFromDb = me?.user?.role || "participant";
        roleToUse = roleFromDb;
      }

      // 4) Notifica ruolo di sessione al backend (coerenza server)
      await apiPost("/users/session-role", { role: roleToUse }, token);

      // 5) Redirect coerente con il ruolo effettivo
      if (roleToUse === "organizer") {
        window.location.href = "organizzatore.html";
      } else {
        window.location.href = "partecipante.html";
      }
    } catch (err) {
      alert("Login fallito: " + (err?.message || "Operazione non riuscita"));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});

