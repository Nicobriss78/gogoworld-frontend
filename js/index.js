// js/index.js — Homepage 0 senza auto-redirect
// Mostra sempre i 3 pulsanti. La scelta del ruolo è SOLO di sessione.
// I pulsanti "Sono un Partecipante"/"Sono un Organizzatore" salvano desiredRole e portano al login.
// "Registrati" va alla pagina di registrazione.

document.addEventListener("DOMContentLoaded", () => {
  const btnParticipant = document.getElementById("btnParticipant");
  const btnOrganizer = document.getElementById("btnOrganizer");
  const btnRegister = document.getElementById("btnRegister");

  function setDesired(role) {
    try { sessionStorage.setItem("desiredRole", role); } catch {}
    try { localStorage.setItem("desiredRole", role); } catch {}
  }

  btnParticipant?.addEventListener("click", (e) => {
    e.preventDefault();
    setDesired("participant");
    window.location.href = "login.html";
  });

  btnOrganizer?.addEventListener("click", (e) => {
    e.preventDefault();
    setDesired("organizer");
    window.location.href = "login.html";
  });

  btnRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "pages/register.html";
  });
});





