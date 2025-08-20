// partecipante.js — liste (disponibili / miei), filtri, join/leave, switch ruolo
document.addEventListener("DOMContentLoaded", () => {
  const listDisp = document.getElementById("eventi-disponibili");
  const listMiei = document.getElementById("miei-eventi");
  const btnLogout = document.getElementById("logoutBtn");
  const btnSwitch = document.getElementById("switchRoleBtn");
  const welcome = document.getElementById("welcome");

  // FILTRI
  const filters = {
    q: document.getElementById("q"),
    visibility: document.getElementById("visibility"),
    isFree: document.getElementById("isFree"),
    dateFrom: document.getElementById("dateFrom"),
    dateTo: document.getElementById("dateTo"),
    city: document.getElementById("city"),
    province: document.getElementById("province"),
    region: document.getElementById("region"),
    country: document.getElementById("country"),
    status: document.getElementById("status"),
    category: document.getElementById("category"),
    type: document.getElementById("type"),
  };

  const token = () => localStorage.getItem("token") || "";
  const uid = () => localStorage.getItem("userId") || "";
  const regRole = () => localStorage.getItem("registeredRole") || "participant";
  const sessRole = () => localStorage.getItem("sessionRole") || "participant";

  if (welcome) welcome.textContent = `Ciao! Sei in sessione come ${sessRole()}`;

  function qs(params) {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k,v]) => {
      if (v === null || v === undefined || v === "") return;
      p.set(k, v);
    });
    return p.toString();
  }

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: Object.assign(
        { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token}` } : {}) },
        opts.headers || {}
      ),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    return res.json();
  }

  function renderList(target, arr, mine = false) {
    target.innerHTML = "";
    arr.forEach(ev => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div>
          <strong>${ev.title || "(senza titolo)"} </strong>
          <div class="meta">${(ev.city||"")}${ev.region?`, ${ev.region}`:""} — ${new Date(ev.dateStart||ev.createdAt||Date.now()).toLocaleString()}</div>
          <div class="toolbar">
            <a href="evento.html?id=${ev._id}">Dettagli</a>
          </div>
        </div>
        <div class="toolbar">
          ${sessRole()==="participant" ? (mine
            ? `<button data-act="leave" data-id="${ev._id}">Annulla</button>`
            : `<button data-act="join" data-id="${ev._id}">Partecipa</button>`) : ""}
        </div>
      `;
      target.appendChild(li);
    });
  }

  async function load() {
    const params = {
      q: filters.q?.value?.trim(),
      visibility: filters.visibility?.value,
      isFree: filters.isFree?.checked ? "true" : "",
      dateFrom: filters.dateFrom?.value,
      dateTo: filters.dateTo?.value,
      city: filters.city?.value,
      province: filters.province?.value,
      region: filters.region?.value,
      country: filters.country?.value,
      status: (filters.status?.value || "published"),
      category: filters.category?.value,
      type: filters.type?.value,
    };
    const query = qs(params);

    const all = await fetchJSON(`/api/events?${query}`); // array
    const myId = uid();
    const mine = all.filter(ev => (ev.participants||[]).some((pid) => String(pid) === String(myId)));
    const disp = all.filter(ev => !(ev.participants||[]).some((pid) => String(pid) === String(myId)));

    renderList(listMiei, mine, true);
    renderList(listDisp, disp, false);
  }

  listDisp?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act='join']");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    await fetchJSON(`/api/users/${uid()}/partecipa`, { method: "POST", body: { eventId: id } });
    await load();
  });

  listMiei?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act='leave']");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    await fetchJSON(`/api/users/${uid()}/annulla`, { method: "POST", body: { eventId: id } });
    await load();
  });

  // switch ruolo
  document.getElementById("switchRoleBtn")?.addEventListener("click", async () => {
    if (regRole() !== "organizer") return alert("Puoi passare a organizzatore solo se registrato come organizer.");
    const next = sessRole() === "organizer" ? "participant" : "organizer";
    const out = await fetchJSON("/api/users/session-role", { method: "PUT", body: { sessionRole: next } });
    if (out?.token) localStorage.setItem("token", out.token);
    localStorage.setItem("sessionRole", out.sessionRole || next);
    window.location.href = next === "organizer" ? "organizzatore.html" : "partecipante.html";
  });

  // logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });

  // carica iniziale
  load();

  // 🔧 fix bfcache: ricarica quando torni dal dettaglio o la tab torna visibile
  window.addEventListener("pageshow", () => load());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") load();
  });

  // filtri
  document.getElementById("filtersForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    load();
  });
});








