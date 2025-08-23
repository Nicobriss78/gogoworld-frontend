// partecipante.js — lista completa eventi + partecipa/annulla + doppia lista
// Aderente alle dinamiche:
// 1) Lista TUTTI gli eventi (campi principali) con "Partecipa" e "Dettagli"
// 2) Lista "Eventi a cui partecipo" con "Annulla partecipazione" e "Dettagli"
// 3) Filtri base (query, type) — estendibili
// 4) Switch ruolo e logout

document.addEventListener("DOMContentLoaded", () => {
  // ---- RIFERIMENTI DOM
  const allBox = document.getElementById("allEventsList");
  const joinedBox = document.getElementById("joinedEventsList");
  const allEmpty = document.getElementById("allEmpty");
  const joinedEmpty = document.getElementById("joinedEmpty");
  const btnLogout = document.getElementById("logoutBtn");
  const btnSwitch = document.getElementById("switchRoleBtn");
  const welcome = document.getElementById("welcome");

  // Filtri
  const qInput = document.getElementById("filterQuery");
  const typeSelect = document.getElementById("filterType");
  const applyBtn = document.getElementById("applyFiltersBtn");
  const resetBtn = document.getElementById("resetFiltersBtn");

  // ---- SESSION HELPERS
  const token = () => localStorage.getItem("token") || localStorage.getItem("ggw_token") || "";
  const getRole = () => localStorage.getItem("sessionRole") || "participant";
  const userId = () => localStorage.getItem("userId") || "";

  if (welcome) welcome.textContent = `Ciao! Sei in sessione come ${getRole()}`;

  async function sessionRoleEnsureParticipant() {
    if (getRole() === "participant") return;
    // Imposta ruolo di sessione a participant
    const res = await fetch("/api/users/session-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token()}`
      },
      body: JSON.stringify({ role: "participant" })
    });
    if (res.ok) {
      localStorage.setItem("sessionRole", "participant");
      const data = await res.json().catch(() => ({}));
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("ggw_token", data.token);
      }
    }
  }

  // ---- API HELPERS (usa window.API se presente, fallback a fetch)
  async function apiGet(path, params) {
    if (window.API?.get) return window.API.get(path, { params });
    const qs = new URLSearchParams(params || {}).toString();
    const url = qs ? `${path}?${qs}` : path;
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${token()}` } });
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
  }
  async function apiPost(path, body) {
    if (window.API?.post) return window.API.post(path, { body, auth: true });
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token()}`
      },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      const t = await res.json().catch(()=>({}));
      throw new Error(t.message || `POST ${path} failed`);
    }
    return res.json();
  }

  // ---- STATO
  let allEvents = [];
  let joinedIds = new Set();

  function renderLists() {
    // ALL
    allBox.innerHTML = "";
    const visible = allEvents.filter(ev => !joinedIds.has(ev._id));
    if (!visible.length) { allEmpty.style.display = "block"; } else { allEmpty.style.display = "none"; }
    for (const ev of visible) {
      allBox.appendChild(renderCard(ev, { inJoined: false }));
    }

    // JOINED
    joinedBox.innerHTML = "";
    const joinedArray = allEvents.filter(ev => joinedIds.has(ev._id));
    if (!joinedArray.length) { joinedEmpty.style.display = "block"; } else { joinedEmpty.style.display = "none"; }
    for (const ev of joinedArray) {
      joinedBox.appendChild(renderCard(ev, { inJoined: true }));
    }
  }

  function toEventUrl(id) {
    const url = new URL(location.origin + "/evento.html");
    url.searchParams.set("id", id);
    return url.pathname + url.search;
  }

  function renderCard(ev, { inJoined }) {
    const div = document.createElement("div");
    div.className = "event-card";
    const mainFields = [
      `<strong>${escapeHtml(ev.title || "Senza titolo")}</strong>`,
      ev.date ? `<div class="muted">${new Date(ev.date).toLocaleString()}</div>` : "",
      ev.location ? `<div>${escapeHtml(ev.location)}</div>` : "",
      ev.type ? `<div class="muted">Tipo: ${escapeHtml(ev.type)}</div>` : ""
    ].filter(Boolean).join("");
    div.innerHTML = `${mainFields}
      <div class="actions">
        <a class="btn" href="${toEventUrl(ev._id)}">Dettagli</a>
        ${inJoined
          ? `<button class="btn danger" data-action="leave" data-id="${ev._id}">Annulla partecipazione</button>`
          : `<button class="btn primary" data-action="join" data-id="${ev._id}">Partecipa</button>`}
      </div>
    `;
    div.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      try {
        if (action === "join") {
          await apiPost(`/api/users/join/${id}`);
          joinedIds.add(id);
        } else if (action === "leave") {
          // alias robusto: prima provo /users/leave, poi /events/:id/leave
          try {
            await apiPost(`/api/users/leave/${id}`);
          } catch {
            await apiPost(`/api/events/${id}/leave`);
          }
          joinedIds.delete(id);
        }
        renderLists();
      } catch (err) {
        alert(err.message || "Operazione non riuscita");
      }
    });
    return div;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  }

  function currentFilters() {
    const f = {};
    const q = qInput?.value?.trim();
    const t = typeSelect?.value;
    if (q) f.q = q;
    if (t) f.type = t;
    return f;
  }

  // Carica info utente per joined
  async function loadJoinedFromMe() {
    try {
      const me = await apiGet("/api/users/me");
      const ids = new Set();
      const arr = me?.joinedEvents || me?.attending || me?.eventsJoined || [];
      for (const it of arr) {
        if (typeof it === "string") ids.add(it);
        else if (it && it._id) ids.add(it._id);
        else if (it && it.eventId) ids.add(it.eventId);
      }
      joinedIds = ids;
    } catch {
      // fallback: mantieni lo stato attuale (vuoto la prima volta)
    }
  }

  async function loadAll() {
    const filters = currentFilters();
    try {
      const data = await apiGet("/api/events", filters);
      allEvents = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    } catch {
      allEvents = [];
    }
  }

  async function refresh() {
    await sessionRoleEnsureParticipant();
    await Promise.all([loadAll(), loadJoinedFromMe()]);
    renderLists();
  }

  if (applyBtn) applyBtn.addEventListener("click", refresh);
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (qInput) qInput.value = "";
      if (typeSelect) typeSelect.value = "";
      refresh();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("ggw_token");
      localStorage.removeItem("sessionRole");
      location.href = "/index.html";
    });
  }

  if (btnSwitch) {
    btnSwitch.addEventListener("click", async () => {
      try {
        await fetch("/api/users/session-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token()}`
          },
          body: JSON.stringify({ role: "organizer" })
        });
        localStorage.setItem("sessionRole", "organizer");
        location.href = "/organizzatore.html";
      } catch {
        alert("Impossibile cambiare ruolo");
      }
    });
  }

  // GO!
  refresh();
});



















