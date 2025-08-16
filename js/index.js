// js/index.js
document.addEventListener('DOMContentLoaded', () => {
  const btnPartecipante = document.getElementById('btn-partecipante');
  const btnOrganizzatore = document.getElementById('btn-organizzatore');

  function setRolesAndGo(desiredEn, it) {
    localStorage.setItem('userRole', it); // es: "partecipante" | "organizzatore"
    localStorage.setItem('desiredRole', desiredEn); // "participant" | "organizer"
    window.location.href = 'login.html';
  }

  if (btnPartecipante) {
    btnPartecipante.addEventListener('click', () => {
      setRolesAndGo('participant', 'partecipante');
    });
  }

  if (btnOrganizzatore) {
    btnOrganizzatore.addEventListener('click', () => {
      setRolesAndGo('organizer', 'organizzatore');
    });
  }
});

