// js/index.js — gestione Homepage 0

document.addEventListener("DOMContentLoaded", () => {
  // Se già loggato → redirect automatico nell’area coerente
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
    try { sessionStorage.setItem("desiredRole", role); } catch {}
    window.location.href = "login.html";
  }

  if (btnOrganizer) btnOrganizer.addEventListener("click", () => selectRole("organizer"));
  if (btnParticipant) btnParticipant.addEventListener("click", () => selectRole("participant"));

  if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      window.location.href = "pages/register.html"; // <- percorso giusto per register
    });
  }
});

