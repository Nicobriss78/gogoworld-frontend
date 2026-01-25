// frontend/js/partecipante-seguiti-utenti.js
// Scheda "Utenti seguiti" (UI v2)
// - usa GET /users/me per id utente loggato
// - usa GET /users/:id/following per lista
// - usa DELETE /users/:id/follow per unfollow

import { apiGet, apiDelete } from "./api.js";
import { showAlert } from "./participant-shared.js";

const container = document.getElementById("followingUsersContainer");
let ME_ID = null;

boot();

async function boot() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  await hydrateTopbar(token);
  await loadFollowing(token);
}

async function hydrateTopbar(token) {
  try {
const meRes = await apiGet("/users/me", token);
const me = meRes?.data || meRes?.user || meRes || null;
    // id utente loggato (robusto come nelle altre schede)
    ME_ID = me?._id || me?.user?._id || me?.id || me?.user?.id || null;

    const name =
      me?.name ||
      me?.user?.name ||
      me?.email ||
      me?.user?.email ||
      "Utente";

    const statusRaw = (me?.status || me?.user?.status || "")
      .toString()
      .toLowerCase();

    const statusLabel = statusRaw
      ? statusRaw[0].toUpperCase() + statusRaw.slice(1)
      : "Partecipante";

    const topName = document.getElementById("gwUserName");
    if (topName) topName.textContent = name;

    const topStatus = document.getElementById("gwUserStatus");
    if (topStatus) topStatus.textContent = statusLabel || "Partecipante";
  } catch {
    // non blocchiamo pagina se fallisce
  }
}

async function loadFollowing(token) {
container.innerHTML = `
  <div class="gw-state gw-state--loading">
    Caricamento...
  </div>
`;

  if (!ME_ID) {
container.innerHTML = `
  <div class="gw-state gw-state--error">
    <strong>Errore</strong>
    Impossibile determinare l'utente loggato.
  </div>
`;
    return;
  }
const res = await apiGet(`/users/${ME_ID}/following`, token);

if (res?.ok === false) {
  container.innerHTML = `
    <div class="gw-state gw-state--error">
      <strong>Errore</strong>
      ${escapeHtml(res?.message || res?.error || "Impossibile caricare gli utenti seguiti.")}
    </div>
  `;
  return;
}

  // supporta sia { ok:true, data:[...] } che array diretto
  const users = Array.isArray(res) ? res : (res?.data || []);

  if (!users.length) {
container.innerHTML = `
  <div class="gw-state gw-state--empty">
    <strong>Nessun risultato</strong>
    Non segui ancora nessun utente.
  </div>
`;
    return;
  }

  renderUsers(users, token);
}

function renderUsers(users, token) {
  container.innerHTML = "";

  users.forEach((u) => {
    const userId = u?._id || u?.id;
    if (!userId) return;
    const name = u?.name || u?.username || "Utente";
    const meta = u?.city || u?.region || u?.country || "";

    const card = document.createElement("div");
    card.className = "gw-rail";

    card.innerHTML = `
      <div class="content">
        <div class="title">${escapeHtml(name)}</div>
        <div class="meta">${escapeHtml(meta)}</div>
        <div class="actions">
          <button class="gw-btn" data-view="${userId}">Profilo</button>
          <button class="gw-btn gw-btn--danger" data-unfollow="${userId}">Smetti di seguire</button>
        </div>
      </div>
    `;

    // Vedi profilo pubblico
    card.querySelector(`[data-view="${userId}"]`).addEventListener("click", () => {
      window.location.href = `pages/user-public.html?userId=${encodeURIComponent(userId)}`;
    });

    // Unfollow
    card.querySelector(`[data-unfollow="${userId}"]`).addEventListener("click", async () => {
      if (!confirm("Vuoi smettere di seguire questo utente?")) return;

      const r = await apiDelete(`/users/${encodeURIComponent(userId)}/follow`, token);
      if (r?.ok === false) {
        showAlert("Errore durante l'operazione.");
        return;
      }

      card.remove();
      if (!container.children.length) {
container.innerHTML = `
  <div class="gw-state gw-state--empty">
    <strong>Nessun risultato</strong>
    Non segui ancora nessun utente.
  </div>
`;
      }
    });

    container.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
