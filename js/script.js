document.addEventListener('DOMContentLoaded', function () {
  const userList = document.getElementById('user-list');

  function createUserListItem(user) {
    const li = document.createElement('li');
    li.textContent = `${user.id} - ${user.name} (${user.email})`;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '❌';
    deleteBtn.onclick = () => deleteUser(user.id, li);

    li.appendChild(deleteBtn);
    return li;
  }

  // Carica utenti esistenti
  fetch('/api/users')
    .then(res => res.json())
    .then(users => {
      users.forEach(user => {
        userList.appendChild(createUserListItem(user));
      });
    })
    .catch(err => {
      console.error('Errore nel caricamento utenti:', err);
    });

  // Gestione aggiunta utente
  document.getElementById('userForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    if (!name || !email) return;

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    })
      .then(res => res.json())
      .then(newUser => {
        userList.appendChild(createUserListItem(newUser));
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
      })
      .catch(err => {
        console.error('Errore nell’aggiunta utente:', err);
      });
  });

  // Gestione eliminazione utente
  function deleteUser(id, liElement) {
    fetch(`/api/users/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error('Errore nella cancellazione');
        userList.removeChild(liElement);
      })
      .catch(err => {
        console.error('Errore eliminazione utente:', err);
      });
  }

  // === EVENTI ===
  const eventList = document.getElementById('event-list');

  // Crea <li> evento
  function createEventListItem(event) {
    const li = document.createElement('li');
    li.textContent = `${event.id} - ${event.title} (${event.date}) @ ${event.location}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '❌';
    deleteBtn.onclick = () => deleteEvent(event.id, li);

    li.appendChild(deleteBtn);
    return li;
  }

  // Carica eventi esistenti
  fetch('/api/events')
    .then(res => res.json())
    .then(events => {
      events.forEach(event => {
        eventList.appendChild(createEventListItem(event));
      });
    })
    .catch(err => {
      console.error('Errore nel caricamento eventi:', err);
    });

  // Aggiungi evento via form
  document.getElementById('eventForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const date = document.getElementById('date').value.trim();
    const location = document.getElementById('location').value.trim();
    if (!title || !date || !location) return;

    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, location })
    })
      .then(res => res.json())
      .then(newEvent => {
        eventList.appendChild(createEventListItem(newEvent));
        document.getElementById('title').value = '';
        document.getElementById('date').value = '';
        document.getElementById('location').value = '';
      })
      .catch(err => {
        console.error('Errore nell’aggiunta evento:', err);
      });
  });

  // Elimina evento
  function deleteEvent(id, liElement) {
    fetch(`/api/events/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error('Errore nella cancellazione');
        eventList.removeChild(liElement);
      })
      .catch(err => {
        console.error('Errore eliminazione evento:', err);
      });
  }
});