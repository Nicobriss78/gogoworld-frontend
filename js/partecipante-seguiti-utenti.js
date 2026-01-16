// =====================================
// P1 – Utenti seguiti (Partecipante)
// =====================================

import { apiGet, apiDelete } from "./api.js";
import { getCurrentUser } from "./auth.js";

const container = document.getElementById("followingUsersContainer");

init();

async function init() {
  try {
    const me = await getCurrentUser();
    if (!me || !me._id) {
      container.innerHTML = "<p>Impossibile determinare l'utente.</p>";
      return;
    }

    loadFollowingUsers(me._id);
  } catch (err) {
    console.error("Errore inizializzazione utenti seguiti:", err);
    container.innerHTML = "<p>Errore di caricamento.</p>";
  }
}

async function loadFollowingUsers(userId) {
  container.innerHTML = "<p>Caricamento...</p>";

  try {
    const res = await apiGet(`/users/${userId}/following`);
    const users = res?.data || [];

    if (users.length === 0) {
      container.innerHTML = "<p>Non segui ancora nessun utente.</p>";
      return;
    }

    renderUsers(users);
  } catch (err) {
    console.error("Errore caricamento utenti seguiti:", err);
    container.innerHTML = "<p>Errore nel recupero degli utenti seguiti.</p>";
  }
}

function renderUsers(users) {
  container.innerHTML = "";

  users.forEach(user => {
    const card = document.createElement("div");
    card.className = "gw-usercard";

    card.innerHTML = `
      <div class="gw-usercard-main">
        <div class="gw-user-avatar">👤</div>
        <div class="gw-user-info">
          <div class="gw-user-name">${user.name || "Utente"}</div>
          <div class="gw-user-meta">${user.city || ""}</div>
        </div>
      </div>

      <div class="gw-usercard-actions">
        <button class="gw-btn gw-btn--ghost" data-view="${user._id}">
          Profilo
        </button>
        <button class="gw-btn gw-btn--danger" data-unfollow="${user._id}">
          Smetti di seguire
        </button>
      </div>
    `;

    // Profilo pubblico
    card.querySelector("[data-view]").addEventListener("click", () => {
      window.location.href = `pages/user-public.html?userId=${user._id}`;
    });

    // Unfollow
    card.querySelector("[data-unfollow]").addEventListener("click", async () => {
      if (!confirm("Vuoi smettere di seguire questo utente?")) return;

      try {
        await apiDelete(`/users/${user._id}/follow`);
        card.remove();

        if (container.children.length === 0) {
          container.innerHTML = "<p>Non segui ancora nessun utente.</p>";
        }
      } catch (err) {
        console.error("Errore unfollow:", err);
        alert("Errore durante l'operazione.");
      }
    });

    container.appendChild(card);
  });
}
