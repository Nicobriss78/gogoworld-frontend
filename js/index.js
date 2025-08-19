// index.js — Homepage 0: scelta ruolo per la sessione
document.addEventListener("DOMContentLoaded", () => {
  const pBtn = document.getElementById("btnParticipant");
  const oBtn = document.getElementById("btnOrganizer");
  const rBtn = document.getElementById("btnRegister");

  function setDesired(role) {
    try { localStorage.setItem("desiredRole", role); } catch {}
    window.location.href = "login.html";
  }

  if (pBtn) pBtn.addEventListener("click", () => setDesired("participant"));
  if (oBtn) oBtn.addEventListener("click", () => setDesired("organizer"));
  if (rBtn) rBtn.addEventListener("click", () => {
    try { localStorage.setItem("desiredRole", "participant"); } catch {}
    window.location.href = "pages/register.html";
  });
});


