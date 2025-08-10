document.addEventListener('DOMContentLoaded', () => {
  const btnPartecipante = document.getElementById('btn-partecipante');
  const btnOrganizzatore = document.getElementById('btn-organizzatore');

  btnPartecipante.addEventListener('click', () => {
    localStorage.setItem('userRole', 'partecipante');
    window.location.href = 'login.html';
  });

  btnOrganizzatore.addEventListener('click', () => {
    localStorage.setItem('userRole', 'organizzatore');
    window.location.href = 'login.html';
  });
});
