// js/partecipante.js — area Partecipante
//
// Funzioni principali:
// - Lista di tutti gli eventi (filtri)
// - Lista eventi a cui partecipo
// - Partecipa / Annulla
// - Dettagli evento
// - Switch ruolo e Logout

import { apiGet, apiPost } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const allList = document.getElementById("allEventsList");
  const myList = document.getElementById("myParticipationsList");
  const btnFilters = document.getElementById("btnApplyFilters");
  const btnLogout = document.getElementById("btnLogout");
  const btnSwitchRole = document.getElementById("btnSwitchRole");

  async function loadEvents(filters = {}) {
    allList.innerHTML = "<p>Caricamento...</p>";
    myList.innerHTML = "";

    try {
      const query = new URLSearchParams(filters).toString();
      const res = await apiGet(`/events${query ? "?" + query : ""}`, token);
      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      const me = await apiGet("/users/me", token);
      const myId = me?.user?._id || me?.user?.id;

      const joinedIds = new Set();
      // estrai da eventi quelli con partecipazione
      res.events.forEach(ev => {
        if (ev.participants?.some(pid => String(pid) === String(myId))) {
          joinedIds.add(ev._id);
        }
      });

      // Popola lista eventi totali
      allList.innerHTML = res.events.map(ev => `
        <div class="event-card">
          <h3>${ev.title}</h3>
          <p>${ev.city || ""} ${ev.date ? new Date(ev.date).toLocaleDateString() : ""}</p>
          <div class="event-actions">
            <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
            ${joinedIds.has(ev._id)
              ? `<button class="btn btn-secondary" data-id="${ev._id}" data-action="leave">Annulla</button>`
              : `<button class="btn btn-primary" data-id="${ev._id}" data-action="join">Partecipa</button>`}
          </div>
        </div>
      `).join("");

      // Popola lista "a cui partecipo"
      const joinedEvents = res.events.filter(ev => joinedIds.has(ev._id));
      myList.innerHTML = joinedEvents.length
        ? joinedEvents.map(ev => `
          <div class="event-card">
            <h3>${ev.title}</h3>
            <p>${ev.city || ""} ${ev.date ? new Date(ev.date).toLocaleDateString() : ""}</p>
            <div class="event-actions">
              <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
              <button class="btn btn-secondary" data-id="${ev._id}" data-action="leave">Annulla</button>
            </div>
          </div>
        `).join("")
        : "<p>Nessuna partecipazione attiva.</p>";

    } catch (err) {
      allList.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
    }
  }

  // Delegation per pulsanti
  function handleAction(e, list) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "details") {
      sessionStorage.setItem("selectedEventId", id);
      window.location.href = "evento.html";
    }
    if (action === "join") {
      apiPost(`/events/${id}/join`, {}, token).then(() => loadEvents());
    }
    if (action === "leave") {
      apiPost(`/events/${id}/leave`, {}, token).then(() => loadEvents());
    }
  }

  allList.addEventListener("click", (e) => handleAction(e, allList));
  myList.addEventListener("click", (e) => handleAction(e, myList));

  if (btnFilters) {
    btnFilters.addEventListener("click", () => {
      const title = document.getElementById("filterTitle").value.trim();
      const city = document.getElementById("filterCity").value.trim();
      const category = document.getElementById("filterCategory").value.trim();
      loadEvents({ title, city, category });
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      sessionStorage.clear();
      window.location.href = "../index.html";
    });
  }

  if (btnSwitchRole) {
    btnSwitchRole.addEventListener("click", () => {
      sessionStorage.setItem("desiredRole", "organizer");
      window.location.href = "organizzatore.html";
    });
  }

  loadEvents();
});
