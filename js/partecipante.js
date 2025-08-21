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
        { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
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
      // ✅ FIX: isFree è un <select>, non una checkbox
      isFree: (filters.isFree?.value || ""),
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

  // ✅ SWITCH/UPGRADE ruolo
  document.getElementById("switchRoleBtn")?.addEventListener("click", async () => {
    try {
      // Se NON sei registrato come organizer → UPGRADE permanente
      if (regRole() !== "organizer") {
        const resp = await fetch("/api/users/upgrade", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token() ? { Authorization: `Bearer ${token()}` } : {})
          }
        });
        if (!resp.ok) throw new Error(`HTTP_${resp.status}`);
        const data = await resp.json(); // { ok:true, token, registeredRole:"organizer", sessionRole:"organizer" }

        if (data?.token) {
          localStorage.setItem("token", data.token);
          try { localStorage.setItem("ggw_token", data.token); } catch {}
        }
        if (data?.registeredRole) localStorage.setItem("registeredRole", data.registeredRole);
        if (data?.sessionRole) localStorage.setItem("sessionRole", data.sessionRole);

        window.location.href = "organizzatore.html";
        return;
      }

      // Altrimenti (sei già organizer): switch di sessione
      const next = sessRole() === "organizer" ? "participant" : "organizer";
      const out = await fetchJSON("/api/users/session-role", { method: "PUT", body: { sessionRole: next } });
      if (out?.token) localStorage.setItem("token", out.token);
      localStorage.setItem("sessionRole", out.sessionRole || next);
      window.location.href = next === "organizer" ? "organizzatore.html" : "partecipante.html";
    } catch (err) {
      console.error("Switch/Upgrade error:", err);
      alert("Operazione non riuscita. Riprova.");
    }
  });

  // logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });

  // carica iniziale
  load();

  // 🔧 FIX ritorno dal dettaglio: ricarica solo se il dettaglio ha impostato il flag
  window.addEventListener("pageshow", () => {
    if (sessionStorage.getItem("ggw_list_dirty") === "1") {
      sessionStorage.removeItem("ggw_list_dirty");
      load();
    }
  });

  // 🔧 UX filtri: ricarica al cambio di un filtro (il tuo HTML usa un <div id="filtersForm">)
  document.getElementById("filtersForm")?.addEventListener("change", () => {
    load();
  });
});










