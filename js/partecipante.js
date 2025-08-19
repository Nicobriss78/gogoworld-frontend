// GoGo.World — partecipante.js aggiornato (Fase 0)
// Usa window.API e window.GGW per coerenza endpoint e gestione ID

document.addEventListener("DOMContentLoaded", () => {
  const eventsContainer = document.getElementById("eventsContainer");
  const logoutBtn = document.getElementById("logoutBtn");
  const switchRoleBtn = document.getElementById("switchRoleBtn");

  // --- Caricamento eventi disponibili
  async function loadEvents() {
    eventsContainer.innerHTML = "<p>Caricamento eventi...</p>";
    try {
      const events = await API.events.list();
      if (!events || !Array.isArray(events)) {
        eventsContainer.innerHTML = "<p>Nessun evento disponibile.</p>";
        return;
      }

      if (events.length === 0) {
        eventsContainer.innerHTML = "<p>Nessun evento trovato.</p>";
        return;
      }

      eventsContainer.innerHTML = "";
      events.forEach(ev => {
        const id = GGW.eventId(ev);
        const div = document.createElement("div");
        div.className = "event-card";

        div.innerHTML = `
          <h3>${ev.title || "Evento senza titolo"}</h3>
          <p>${ev.city || ev.location || ""} — ${GGW.formatDateTime(ev.dateStart || ev.date)}</p>
          <button class="joinBtn" data-id="${id}">Partecipa</button>
          <button class="cancelBtn" data-id="${id}">Annulla</button>
        `;

        eventsContainer.appendChild(div);
      });
    } catch (err) {
      console.error("Errore caricamento eventi:", err);
      eventsContainer.innerHTML = "<p>Errore durante il caricamento eventi.</p>";
    }
  }

  // --- Partecipazione evento
  async function joinEvent(eventId) {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("Utente non identificato. Effettua il login.");
        return;
      }
      await API.post(`/api/users/${userId}/partecipa`, { body: { eventId } });
      alert("Partecipazione confermata!");
      loadEvents();
    } catch (err) {
      console.error("Errore partecipazione:", err);
      alert("Errore durante la partecipazione all'evento.");
    }
  }

  // --- Annulla partecipazione
  async function cancelEvent(eventId) {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("Utente non identificato. Effettua il login.");
        return;
      }
      await API.post(`/api/users/${userId}/annulla`, { body: { eventId } });
      alert("Partecipazione annullata.");
      loadEvents();
    } catch (err) {
      console.error("Errore annullamento:", err);
      alert("Errore durante l'annullamento.");
    }
  }

  // --- Delegazione eventi click
  eventsContainer.addEventListener("click", (e) => {
    const joinBtn = e.target.closest(".joinBtn");
    const cancelBtn = e.target.closest(".cancelBtn");

    if (joinBtn) {
      const id = joinBtn.dataset.id;
      joinEvent(id);
    }
    if (cancelBtn) {
      const id = cancelBtn.dataset.id;
      cancelEvent(id);
    }
  });

  // --- Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      API.clearToken();
      localStorage.clear();
      window.location.href = "login.html";
    });
  }

  // --- Switch ruolo (participant → organizer)
  if (switchRoleBtn) {
    switchRoleBtn.addEventListener("click", async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return alert("Utente non identificato.");

      try {
        const resp = await API.put(`/api/users/${userId}/role`, { body: { role: "organizer" } });
        if (resp && resp.currentRole === "organizer") {
          localStorage.setItem("currentRole", "organizer");
          window.location.href = "organizzatore.html";
        } else {
          alert("Errore nello switch ruolo.");
        }
      } catch (err) {
        console.error("Errore switch ruolo:", err);
        alert("Errore nello switch ruolo.");
      }
    });
  }

  // Avvio
  loadEvents();
});







