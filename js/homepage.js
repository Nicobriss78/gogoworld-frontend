document.addEventListener('DOMContentLoaded', () => {
  const loggedUser = localStorage.getItem('loggedUser');

  // Se è già loggato, reindirizza subito
  if (loggedUser) {
    window.location.href = 'organizzatore.html';
    return;
  }

  const organizzatoreBtn = document.getElementById('organizzatore-btn');
  const partecipanteBtn = document.getElementById('partecipante-btn');

  organizzatoreBtn.addEventListener('click', () => {
    const loggedUser = localStorage.getItem('loggedUser');
    if (loggedUser) {
      window.location.href = 'organizzatore.html';
    } else {
      window.location.href = 'login.html';
    }
  });

  partecipanteBtn.addEventListener('click', () => {
    window.location.href = 'partecipante.html';
  });
});
