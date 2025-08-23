// index.js — landing
// Comportamento corretto:
// - Se l'utente è già autenticato -> vai subito alla vista coerente col sessionRole.
// - Se NON è autenticato -> resta in home (niente redirect automatico al login).

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const sessionRole = localStorage.getItem("sessionRole") || "participant";

  if (token) {
    // Utente già loggato: entro direttamente nell'area corretta
    if (sessionRole === "organizer") {
      window.location.href = "organizzatore.html";
    } else {
      window.location.href = "partecipante.html";
    }
    return; // interrompo qui
  }

  // Nessun token: RESTO in home (niente redirect automatico).
  // La pagina offre i pulsanti/cta "Login" e "Registrati" (gestiti dall'HTML).
  // Se hai pulsanti con id, puoi opzionalmente agganciare i click:
  const goLogin = document.getElementById("goLogin");
  const goRegister = document.getElementById("goRegister");

  goLogin?.addEventListener("click", () => {
    window.location.href = "login.html";
  });
  goRegister?.addEventListener("click", () => {
    window.location.href = "register.html";
  });
});



