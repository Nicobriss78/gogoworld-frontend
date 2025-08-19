// partecipante.js — filtri + doppia lista + switch sessionRole senza re-login
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
    category: document.getElementById("category"),
    type: document.getElementById("type"),
    status: document.getElementById("status"),
  };

  function token() { return localStorage.getItem("token") || ""; }
  function userId() { return localStorage.getItem("userId") || ""; }
  function sessionRole() { return localStorage.getItem("sessionRole") || ""; }
  function registeredRole() { return localStorage.getItem("registeredRole") || ""; }

  // Benvenuto (finché /api/users/me non restituisce il nome, mostro solo ruoli)
  if (welcome) {
    const sr = sessionRole();
    const rr = registeredRole();
    welcome.textContent = sr ? `— ruolo attivo: ${sr} (ruolo registrato: ${rr})` : "";
  }

  async function fetchJSON(url, opts = {}) {
    const resp = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token()}`,
        ...(opts.headers || {})
      }
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  }

  // Costruisce query string dai filtri attivi
  function buildQuery() {
    const sp = new URLSearchParams();
    Object.entries(filters).forEach(([key, el]) => {
      const val = (el?.value ?? "").trim();
      if (val) sp.set(key, val);
    });
    // Default: se non c'è status, forzo published (coerente con UX Partecipante)
    if (!sp.has("status")) sp.set("status", "published");
    return sp.toString() ? `?${sp.toString()}` : "";
  }

  function setLoading(on) {
    if (on) {
      listDisp && (listDisp.innerHTML = `<li class="loading">Caricamento...</li>`);
      listMiei && (listMiei.innerHTML = `<li class="loading">Caricamento...</li>`);
    }
  }

  function renderLists(events) {
    if (listDisp) listDisp.innerHTML = "";
    if (listMiei) listMiei.innerHTML = "";

    const uid = userId();
    const mine = [];
    const others = [];

    (events || []).forEach(ev => {
      const isMine = (ev.participants || []).some(pid => String(pid) === String(uid));
      (isMine ? mine : others).push(ev);
    });

    const makeItem = (ev, join) => {
      const li = document.createElement("li");
      const when = ev.dateStart ? new Date(ev.dateStart).toLocaleString("it-IT") : "";
      const where = ev.city || ev.location || "";
      const vis = ev.visibility ? `<span class="badge">${ev.visibility}</span>` : "";
      li.innerHTML = `
        <div>
          <div><strong>${ev.title || "Senza titolo"}</strong> ${vis}</div>
          <div class="meta">${where ? where + " · " : ""}${when}</div>
        </div>
        <div>
          <a href="evento.html?id=${ev._id}" class="btn-ghost" style="margin-right:8px;">Dettagli</a>
          <button class="${join ? "join" : "leave"}" data-id="${ev._id}">
            ${join ? "Partecipa" : "Annulla partecipazione"}
          </button>
        </div>
      `;
      return li;
    };

    if (others.length === 0 && listDisp) {
      listDisp.innerHTML = `<li>Nessun evento disponibile con i filtri correnti.</li>`;
    } else {
      others.forEach(ev => listDisp && listDisp.appendChild(makeItem(ev, true)));
    }

    if (mine.length === 0 && listMiei) {
      listMiei.innerHTML = `<li>Non stai partecipando ad alcun evento con i filtri correnti.</li>`;
    } else {
      mine.forEach(ev => listMiei && listMiei.appendChild(makeItem(ev, false)));
    }
  }

  async function load() {
    setLoading(true);
    try {
      const qs = buildQuery();
      const data = await fetchJSON(`/api/events${qs}`);
      renderLists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      listDisp && (listDisp.innerHTML = `<li>Errore nel caricamento.</li>`);
      listMiei && (listMiei.innerHTML = `<li>Errore nel caricamento.</li>`);
    }
  }

  // Azioni join/leave
  [listDisp, listMiei].forEach(list => {
    if (!list) return;
    list.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      try {
        if (btn.classList.contains("join")) {
          await fetchJSON(`/api/users/${userId()}/partecipa`, { method: "POST", body: JSON.stringify({ eventId: id }) });
        } else {
          await fetchJSON(`/api/users/${userId()}/annulla`, { method: "POST", body: JSON.stringify({ eventId: id }) });
        }
        await load();
      } catch (err) {
        console.error(err);
        alert("Operazione non riuscita.");
      }
    });
  });

  // Switch ruolo dinamico (→ organizer) SENZA re-login
  if (btnSwitch) {
    btnSwitch.addEventListener("click", async () => {
      try {
        const out = await fetchJSON(`/api/users/session-role`, {
          method: "PUT",
          body: JSON.stringify({ sessionRole: "organizer" })
        });
        localStorage.setItem("token", out.token);
        localStorage.setItem("sessionRole", out.sessionRole);
        window.location.href = "organizzatore.html";
      } catch (err) {
        console.error(err);
        alert("Impossibile cambiare ruolo.");
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  }

  // Hook filtri (debounce)
  const debounced = (fn, ms = 250) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };
  Object.values(filters).forEach(el => {
    if (!el) return;
    const ev = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(ev, debounced(load, 250));
  });

  load();
  // (Opzionale) Real-time leggero: refresh ogni 20s
  // setInterval(load, 20000);
});






