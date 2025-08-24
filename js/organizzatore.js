// js/organizzatore.js — area Organizzatore
//
// Funzioni principali:
// - Lista eventi creati dall'organizzatore
// - Filtri sui campi principali
// - Dettagli evento
// - Modifica/Elimina evento
// - Refresh dinamico al ritorno
// - Switch ruolo e Logout

import { apiGet, apiDelete } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const listContainer = document.getElementById("myEventsList");
  const btnFilters = document.getElementById("btnApplyFilters");
  const btnLogout = document.getElementById("btnLogout");
  const btnSwitchRole = document.getElementById("btnSwitchRole");
  const btnCreate = document.getElementById("btnCreateEvent");

  async function loadEvents(filters = {}) {
    listContainer.innerHTML = "<p>Caricamento...</p>";
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await apiGet(`/events/mine/list${query ? "?" + query : ""}`, token);
      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      if (!res.events.length) {
        listContainer.innerHTML = "<p>Nessun evento creato.</p>";
        return;
      }

      listContainer.innerHTML = res.events.map(ev => `
        <div class="event-card">
          <h3>${ev.title}</h3>
          <p>${ev.city || ""} ${ev.date ? new Date(ev.date).toLocaleDateString() : ""}</p>
          <div class="event-actions">
            <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
            <button class="btn btn-secondary" data-id="${ev._id}" data-action="delete">Elimina</button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      listContainer.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
    }
  }

  // Event delegation
  if (listContainer) {
    listContainer.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === "details") {
        sessionStorage.setItem("selectedEventId", id);
        window.location.href = "evento.html";
      }
      if (action === "delete") {
        if (confirm("Sei sicuro di voler eliminare questo evento?")) {
          await apiDelete(`/events/${id}`, token);
          await loadEvents();
        }
      }
    });
  }

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
      sessionStorage.setItem("desiredRole", "participant");
      window.location.href = "partecipante.html";
    });
  }

  if (btnCreate) {
    btnCreate.addEventListener("click", () => {
      alert("Funzione 'Crea nuovo evento' da implementare (form dedicato).");
    });
  }

  loadEvents();
});

