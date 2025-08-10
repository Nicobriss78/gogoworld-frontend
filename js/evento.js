document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const eventId = parseInt(params.get('id'), 10);

  try {
    const response = await fetch('/api/events');
    const events = await response.json();
    const evento = events.find(ev => ev.id === eventId);

    if (!evento) {
      document.body.innerHTML = '<p>Evento non trovato</p>';
      return;
    }

    document.getElementById('evento-titolo').textContent = evento.title;
    document.getElementById('evento-data').textContent = evento.date;
    document.getElementById('evento-luogo').textContent = evento.location;

  } catch (error) {
    console.error('Errore nel caricamento evento:', error);
    document.body.innerHTML = '<p>⚠️ Errore durante il caricamento</p>';
  }
});
