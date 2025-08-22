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

  // Leggi filtri dalla URL (persistenza su refresh/F5)
  function readFiltersFromURL() {
    const u = new URL(location.href);
    const set = (el, val) => { if (el && val != null) el.value = val; };
    set(filters.q, u.searchParams.get("q"));
    set(filters.visibility, u.searchParams.get("visibility"));
    set(filters.isFree, u.searchParams.get("isFree"));
    set(filters.dateFrom, u.searchParams.get("dateFrom"));
    set(filters.dateTo, u.searchParams.get("dateTo"));
    set(filters.city, u.searchParams.get("city"));
    set(filters.province, u.searchParams.get("province"));
    set(filters.region, u.searchParams.get("region"));
    set(filters.country, u.searchParams.get("country"));
    set(filters.status, u.searchParams.get("status") || "published");
    set(filters.category, u.searchParams.get("category"));
    set(filters.type, u.searchParams.get("type"));
  }

  function collectFilters() {
    return {
      q: filters.q?.value?.trim(),
      visibility: filters.visibility?.value,
      isFree: filters.isFree?.checked ? "true" : "",
      dateFrom: filters.dateFrom?.value,
      dateTo: filters.dateTo?.value,
      city: filters.city?.value?.trim(),
      province: filters.province?.value?.trim(),
      region: filters.region?.value?.trim(),
      country: filters.country?.value?.trim(),
      status: filters.status?.value || "published",
      category: filters.category?.value?.trim(),
      type: filters.type?.value?.trim(),
    };
  }

  function applyFilters() {
    const f = collectFilters();
    const query = qs(f);
    const url = new URL(location.href);
    url.search = query;
    history.replaceState(null, "", url);
    load();
  }

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: Object.assign(
        { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        opts.headers || {}
      ),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    return res.json();
  }

  async function load() {
    readFiltersFromURL();
    const query = qs(collectFilters());
    const all = await fetchJSON(`/api/events?${query}`); // array
    const myId = uid();
    const mine = all.filter(ev => (ev.participants||[]).some((pid) => String(pid) === String(myId)));
    const disp = all.filter(ev => !(ev.participants||[]).some((pid) => String(pid) === String(myId)));

    renderList(listMiei, mine, true);
    renderList(listDisp, disp, false);
  }

  function renderList(target, arr, mine = false) {
    target.innerHTML = "";
    arr.forEach(ev => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div>
          <strong>${ev.title || "(senza titolo)"} </strong>
          <div class="meta">${(ev.city||"")}${ev.region?`, ${ev.region}`:""}${ev.country?`, ${ev.country}`:""} • ${new Date(ev.dateStart||ev.createdAt||Date.now()).toLocaleString()}</div>
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

  // JOIN/LEAVE
  listDisp?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act='join']");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    // 🔁 Unificazione: endpoint standard /api/events/:id/join
    await fetchJSON(`/api/events/${id}/join`, { method: "POST" });
    await load();
  });

  listMiei?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act='leave']");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    // 🔁 Unificazione: endpoint standard /api/events/:id/leave
    await fetchJSON(`/api/events/${id}/leave`, { method: "DELETE" });
    await load();
  });

  // SWITCH / UPGRADE ruolo
  document.getElementById("switchRoleBtn")?.addEventListener("click", async () => {
    try {
      if (regRole() !== "organizer") {
        const resp = await fetch("/api/users/upgrade", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token() ? { Authorization: `Bearer ${token()}` } : {})
          }
        });
        if (!resp.ok) throw new Error(`HTTP_${resp.status}`);
        const data = await resp.json();
        if (data?.token) {
          localStorage.setItem("token", data.token);
          try { localStorage.setItem("ggw_token", data.token); } catch {}
        }
        if (data?.registeredRole) localStorage.setItem("registeredRole", data.registeredRole);
        if (data?.sessionRole) localStorage.setItem("sessionRole", data.sessionRole);
        window.location.href = "organizzatore.html";
        return;
      }
      const next = sessRole() === "organizer" ? "participant" : "organizer";
      const out = await fetchJSON("/api/users/session-role", { method: "PUT", body: { sessionRole: next } });
      if (out?.sessionRole) localStorage.setItem("sessionRole", out.sessionRole);
      window.location.reload();
    } catch (err) {
      alert("Impossibile cambiare ruolo al momento.");
    }
  });

  // LOGOUT
  btnLogout?.addEventListener("click", () => {
    try { localStorage.removeItem("ggw_token"); } catch {}
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });

  // carica iniziale
  load();

  // ritorno dal dettaglio: ricarica solo se il dettaglio ha impostato il flag
  window.addEventListener("pageshow", () => {
    if (sessionStorage.getItem("ggw_list_dirty") === "1") {
      sessionStorage.removeItem("ggw_list_dirty");
      load();
    }
  });

  // UX filtri: ENTER, CHANGE, e SUBMIT con la lente
  const filtersBox = document.getElementById("filtersForm");
  // Enter dentro un input
  filtersBox?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
    }
  });
  // Cambio di select/input
  filtersBox?.addEventListener("change", () => applyFilters());
  // ✅ submit del form (click sulla lente)
  filtersBox?.addEventListener("submit", (e) => {
    e.preventDefault();
    applyFilters();
  });
});















