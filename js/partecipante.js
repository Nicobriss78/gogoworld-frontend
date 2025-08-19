// partecipante.js — due elenchi (disponibili / miei), switch sessionRole senza re-login
document.addEventListener("DOMContentLoaded", () => {
  const listDisp = document.getElementById("eventi-disponibili");
  const listMiei = document.getElementById("miei-eventi");
  const btnLogout = document.getElementById("logoutBtn");
  const btnSwitch = document.getElementById("switchRoleBtn");

  function token() { return localStorage.getItem("token") || ""; }
  function userId() { return localStorage.getItem("userId") || ""; }

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
      li.innerHTML = `
        <strong>${ev.title || "Senza titolo"}</strong>
        <span> — ${ev.city || ""} · ${new Date(ev.dateStart).toLocaleString("it-IT")}</span>
        <button class="${join ? "join" : "leave"}" data-id="${ev._id}">
          ${join ? "Partecipa" : "Annulla partecipazione"}
        </button>
      `;
      return li;
    };

    others.forEach(ev => listDisp && listDisp.appendChild(makeItem(ev, true)));
    mine.forEach(ev => listMiei && listMiei.appendChild(makeItem(ev, false)));
  }

  async function load() {
    // Filtri minimi: solo pubblicati
    const data = await fetchJSON(`/api/events?status=published`);
    renderLists(Array.isArray(data) ? data : []);
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

  // Switch ruolo dinamico (→ organizer) SENZA re-login: chiediamo nuovo token di sessione
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

  load();
  // (Opzionale) Real-time leggero: refresh ogni 20s
  // setInterval(load, 20000);
});








