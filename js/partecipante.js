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
  const myList = document.getElementById("myEventsList");
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

      // Messaggio di benvenuto (solo FE, senza nuove rotte)
      try {
        const name = me?.user?.name || me?.user?.email || "utente";
        const role = "Partecipante";
        const main = document.querySelector("main") || document.body;
        const p = document.createElement("p");
        p.id = "welcomeMsg";
        p.className = "welcome";
        p.textContent = `Benvenuto, ${name}! Sei nella tua area ${role}.`;
        if (main.firstChild) main.insertBefore(p, main.firstChild); else main.appendChild(p);
      } catch {}

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
      const joined = res.events.filter(ev => joinedIds.has(ev._id));
      myList.innerHTML = joined.length
        ? joined.map(ev => `
          <div class="event-card">
            <h3>${ev.title}</h3>
            <p>${ev.city || ""} ${ev.date ? new Date(ev.date).toLocaleDateString() : ""}</p>
            <div class="event-actions">
              <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
              <button class="btn btn-secondary" data-id="${ev._id}" data-action="leave">Annulla</button>
            </div>
          </div>
        `).join("")
        : "<p>Nessun evento a cui partecipi.</p>";

    } catch (err) {
      allList.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
      myList.innerHTML = "";
    }
  }

  // Event delegation
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");

    if (action === "details") {
      sessionStorage.setItem("selectedEventId", id);
      window.location.href = "evento.html";
      return;
    }

    if (action === "join") {
      const res = await apiPost(`/events/${id}/join`, {}, token);
      if (!res.ok) {
        alert(res.error || "Errore partecipazione");
        return;
      }
      await loadEvents();
      return;
    }

    if (action === "leave") {
      const res = await apiPost(`/events/${id}/leave`, {}, token);
      if (!res.ok) {
        alert(res.error || "Errore annullamento");
        return;
      }
      await loadEvents();
      return;
    }
  });

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
      sessionStorage.setItem("desiredRole", "organizer");
      window.location.href = "organizzatore.html";
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

  // Prima lista
  loadEvents();
});


