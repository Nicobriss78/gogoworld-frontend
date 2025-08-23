// login.js — login con rispetto del ruolo desiderato scelto in homepage
// Mantiene tutta la logica esistente: salva token, userId, registeredRole, sessionRole e redirige nella vista corretta.
// Aggiunta chirurgica: invio di desiredRole (se presente) al backend.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // ruolo desiderato impostato in homepage (opzionale)
    let desiredRole = null;
    try { desiredRole = localStorage.getItem("desiredRole"); } catch {}

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          // opzionale, il BE lo rispetta solo se compatibile
          desiredRole: desiredRole || undefined
        }),
      });
      if (!res.ok) {
        let msg = "Credenziali non valide";
        try { const j = await res.json(); if (j?.error || j?.message) msg = j.error || j.message; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();

      // pulizia desiredRole per evitare residui nei prossimi login
      try { localStorage.removeItem("desiredRole"); } catch {}

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("registeredRole", data.registeredRole || "participant");
      localStorage.setItem("sessionRole", data.sessionRole || data.registeredRole || "participant");

      if ((data.sessionRole || "participant") === "organizer") {
        window.location.href = "organizzatore.html";
      } else {
        window.location.href = "partecipante.html";
      }
    } catch (err) {
      alert("Login fallito: " + err.message);
    }
  });
});









