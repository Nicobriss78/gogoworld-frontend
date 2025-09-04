// js/index.js — gestione Homepage 0
//
// Funzioni principali:
// - Scelta ruolo iniziale (organizzatore/partecipante)
// - Salvataggio in sessionStorage
// - Redirect a login.html
// - Pulsante "Registrati" -> register.html

document.addEventListener("DOMContentLoaded", () => {
  // PATCH: se già loggato → redirect automatico nell’area coerente
  const token = localStorage.getItem("token");
  if (token) {
    const role = (sessionStorage.getItem("desiredRole") || "participant");
    window.location.href = role === "organizer" ? "organizzatore.html" : "partecipante.html";
    return;
  }

  const btnOrganizer = document.getElementById("btnOrganizer");
  const btnParticipant = document.getElementById("btnParticipant");
  const btnRegister = document.getElementById("btnRegister");

  function selectRole(role) {
    // PATCH: protezione su sessionStorage
    try { sessionStorage.setItem("desiredRole", role); } catch {}
    window.location.href = "login.html";
  }

  if (btnOrganizer) {
    btnOrganizer.addEventListener("click", () => selectRole("organizer"));
  }
  if (btnParticipant) {
    btnParticipant.addEventListener("click", () => selectRole("participant"));
  }
  if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      window.location.href = "register.html";
    });
  }
});

