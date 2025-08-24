// js/index.js — gestione Homepage 0
//
// Funzioni principali:
// - Scelta ruolo iniziale (organizzatore/partecipante)
// - Salvataggio in sessionStorage
// - Redirect a login.html
// - Pulsante "Registrati" -> pages/register.html

document.addEventListener("DOMContentLoaded", () => {
  const btnOrganizer = document.getElementById("btnOrganizer");
  const btnParticipant = document.getElementById("btnParticipant");
  const btnRegister = document.getElementById("btnRegister");

  function selectRole(role) {
    sessionStorage.setItem("desiredRole", role);
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
      window.location.href = "pages/register.html";
    });
  }
});
