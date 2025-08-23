// index.js — landing aderente ai file reali
// - Se l'utente è loggato: redirect immediato alla vista coerente col sessionRole.
// - Se NON è loggato: resta in homepage e abilita i due pulsanti reali:
// #btnParticipant e #btnOrganizer → scrivono desiredRole e portano al login.

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const sessionRole = localStorage.getItem("sessionRole") || "participant";

  if (token) {
    if (sessionRole === "organizer") {
      window.location.href = "organizzatore.html";
    } else {
      window.location.href = "partecipante.html";
    }
    return;
  }

  // Homepage: pulsanti reali
  const btnParticipant = document.getElementById("btnParticipant");
  const btnOrganizer = document.getElementById("btnOrganizer");

  btnParticipant?.addEventListener("click", (e) => {
    e.preventDefault();
    try { localStorage.setItem("desiredRole", "participant"); } catch {}
    window.location.href = "login.html";
  });

  btnOrganizer?.addEventListener("click", (e) => {
    e.preventDefault();
    try { localStorage.setItem("desiredRole", "organizer"); } catch {}
    window.location.href = "login.html";
  });
});





