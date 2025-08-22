// index.js — login status check + redirect coerente
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const sessRole = localStorage.getItem("sessionRole");
  const regRole = localStorage.getItem("registeredRole");

  if (token) {
    if (sessRole === "organizer") {
      window.location.href = "organizzatore.html";
    } else {
      window.location.href = "partecipante.html";
    }
  } else {
    window.location.href = "login.html";
  }
});



