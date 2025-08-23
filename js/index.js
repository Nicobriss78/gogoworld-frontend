// index.js — landing minimale e aderente alla struttura
// Regole:
// - Se l'utente è già autenticato: redirect immediato alla vista coerente col sessionRole.
// - Se NON è autenticato: resta in homepage. Nessun binding JS ai pulsanti.
// (La navigazione è demandata ai link presenti nell'HTML per evitare ipotesi sui selettori.)

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const sessionRole = localStorage.getItem("sessionRole") || "participant";

  if (token) {
    // Utente già loggato: entra direttamente nella vista coerente
    if (sessionRole === "organizer") {
      window.location.href = "organizzatore.html";
    } else {
      window.location.href = "partecipante.html";
    }
    return;
  }

  // Nessun token: RESTA in homepage.
  // Nessun event listener aggiunto: i link dell'HTML gestiscono la navigazione.
});

});




