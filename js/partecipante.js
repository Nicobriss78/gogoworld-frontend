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
  }

  // Messaggio di benvenuto (solo FE, senza nuove rotte)
  (async () => {
    try {
      const me = await apiGet("/users/me", token);
      const name = me?.user?.name || me?.user?.email || "utente";
      const role = "Organizzatore";
      const main = document.querySelector("main") || document.body;
      const p = document.createElement("p");
      p.id = "welcomeMsg";
      p.className = "welcome";
      p.textContent = `Benvenuto, ${name}! Sei nella tua area ${role}.`;
      if (main.firstChild) main.insertBefore(p, main.firstChild); else main.appendChild(p);
    } catch {}
  })();

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
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");

      if (action === "details") {
        sessionStorage.setItem("selectedEventId", id);
        window.location.href = "evento.html";
        return;
      }

      if (action === "delete") {
        if (!confirm("Eliminare questo evento?")) return;
        const res = await apiDelete(`/events/${id}`, token);
        if (!res.ok) {
          alert(res.error || "Errore eliminazione");
          return;
        }
        await loadEvents();
      }
    });
  }

  // Filtri
  if (btnFilters) {
    btnFilters.addEventListener("click", async () => {
      const filters = {};
      const title = document.getElementById("filterTitle")?.value?.trim();
      const city = document.getElementById("filterCity")?.value?.trim();
      const region = document.getElementById("filterRegion")?.value?.trim();
      const dateStart = document.getElementById("filterDateStart")?.value?.trim();
      const dateEnd = document.getElementById("filterDateEnd")?.value?.trim();
      if (title) filters.title = title;
      if (city) filters.city = city;
      if (region) filters.region = region;
      if (dateStart) filters.dateStart = dateStart;
      if (dateEnd) filters.dateEnd = dateEnd;
      await loadEvents(filters);
    });
  }

  // Switch ruolo
  if (btnSwitchRole) {
    btnSwitchRole.addEventListener("click", () => {
      sessionStorage.setItem("desiredRole", "participant");
      window.location.href = "partecipante.html";
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("desiredRole");
      window.location.href = "../index.html";
    });
  }

  // Create (placeholder)
  if (btnCreate) {
    btnCreate.addEventListener("click", () => {
      alert("Funzione Crea evento: in arrivo.");
    });
  }

  // Prima lista
  loadEvents();
});

